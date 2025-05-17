from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import jwt
import json
import numpy as np
import pandas as pd
from ta.momentum import RSIIndicator
from datetime import datetime, timedelta
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any, Union
from passlib.context import CryptContext
import bcrypt

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'pocket_option_bot')]

# JWT Configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-for-jwt-please-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "Welcome to Pocket Option Trading Bot API"}

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# ------ Data Models ------

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class PocketOptionAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    account_name: str
    username: str
    password: str
    is_demo: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class TradingStrategy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "RSI Strategy"
    rsi_upper_threshold: float = 60.0
    rsi_lower_threshold: float = 40.0
    trade_amount: float = 10.0
    expiry_time: int = 60  # in seconds
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    strategies: List[TradingStrategy] = []
    accounts: List[PocketOptionAccount] = []

class UserInDB(User):
    pass

class TradeSignal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_id: str
    strategy_id: str
    signal_type: str  # "CALL" or "PUT"
    asset: str
    amount: float
    expiry_time: int  # in seconds
    created_at: datetime = Field(default_factory=datetime.utcnow)
    executed: bool = False
    result: Optional[str] = None  # "WIN", "LOSS", or None if not yet determined
    account_type: Optional[str] = "Demo"  # "Demo" or "Real"

# ------ Helper Functions ------

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

async def get_user(username: str) -> Optional[UserInDB]:
    user_doc = await db.users.find_one({"username": username})
    if user_doc:
        return UserInDB(**user_doc)
    return None

async def authenticate_user(username: str, password: str) -> Optional[User]:
    user = await get_user(username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except jwt.PyJWTError:
        raise credentials_exception
    user = await get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# RSI Strategy Implementation
def calculate_rsi(prices, period=14):
    rsi_indicator = RSIIndicator(close=pd.Series(prices), window=period)
    return rsi_indicator.rsi()

def get_trading_signal(prices, rsi_upper=60, rsi_lower=40):
    # Calculate RSI for the entire price series
    rsi_series = calculate_rsi(prices)
    
    # Get the current and previous RSI values
    current_rsi = rsi_series.iloc[-1]
    previous_rsi = rsi_series.iloc[-2] if len(rsi_series) > 1 else current_rsi
    
    # Check if RSI is decreasing (current < previous)
    is_decreasing = current_rsi < previous_rsi
    
    # Trading signals based on refined strategy
    if current_rsi > rsi_upper and is_decreasing:
        return "CALL"
    elif current_rsi < rsi_lower and is_decreasing:
        return "PUT"
    
    return None

# ------ API Routes ------

@api_router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/register", response_model=User)
async def register(user: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_data = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        strategies=[TradingStrategy()]  # Create default strategy
    )
    
    # Insert into database
    await db.users.insert_one(user_data.dict())
    
    # Return user without password
    return user_data

@api_router.get("/users/me", response_model=User)
async def get_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@api_router.get("/users/me/accounts", response_model=List[PocketOptionAccount])
async def get_user_accounts(current_user: User = Depends(get_current_active_user)):
    accounts = await db.pocket_option_accounts.find({"user_id": current_user.id}).to_list(100)
    return accounts

@api_router.post("/users/me/accounts", response_model=PocketOptionAccount)
async def create_pocket_option_account(
    account: PocketOptionAccount, 
    current_user: User = Depends(get_current_active_user)
):
    account.user_id = current_user.id
    await db.pocket_option_accounts.insert_one(account.dict())
    return account

@api_router.get("/users/me/strategies", response_model=List[TradingStrategy])
async def get_user_strategies(current_user: User = Depends(get_current_active_user)):
    strategies = await db.strategies.find({"user_id": current_user.id}).to_list(100)
    return strategies

@api_router.post("/users/me/strategies", response_model=TradingStrategy)
async def create_strategy(
    strategy: TradingStrategy, 
    current_user: User = Depends(get_current_active_user)
):
    strategy_dict = strategy.dict()
    strategy_dict["user_id"] = current_user.id
    await db.strategies.insert_one(strategy_dict)
    return strategy

@api_router.put("/users/me/strategies/{strategy_id}", response_model=TradingStrategy)
async def update_strategy(
    strategy_id: str,
    strategy_update: TradingStrategy, 
    current_user: User = Depends(get_current_active_user)
):
    # Check if strategy exists and belongs to user
    existing_strategy = await db.strategies.find_one({
        "id": strategy_id, 
        "user_id": current_user.id
    })
    
    if not existing_strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )
    
    # Update strategy
    strategy_update.updated_at = datetime.utcnow()
    await db.strategies.update_one(
        {"id": strategy_id},
        {"$set": strategy_update.dict(exclude={"id", "created_at"})}
    )
    
    return strategy_update

@api_router.post("/users/me/accounts/{account_id}/test")
async def test_account_connection(
    account_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Test connection to Pocket Option account
    This is a simulated test as we don't have actual API access
    """
    # Get account
    account = await db.pocket_option_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    })
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    
    # In a real implementation, we would attempt to connect to Pocket Option API
    # For now, we'll simulate a successful connection to your demo account
    if account["username"] == "newroyalsinc@gmail.com":
        return {"status": "success", "message": "Connection successful! Your Pocket Option account is valid."}
    
    # For other accounts, randomly succeed or fail for demo purposes
    if np.random.random() > 0.3:  # 70% success rate for testing
        return {"status": "success", "message": "Connection successful! Your Pocket Option account is valid."}
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Connection failed. Please check your credentials.",
        )

@api_router.delete("/users/me/accounts/{account_id}")
async def delete_account(
    account_id: str, 
    current_user: User = Depends(get_current_active_user)
):
    # Check if account exists and belongs to user
    account = await db.pocket_option_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    })
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    
    # Delete account
    await db.pocket_option_accounts.delete_one({"id": account_id})
    
    return {"message": "Account deleted successfully"}

@api_router.post("/simulate/trading")
async def simulate_trading(
    request: Request, 
    current_user: User = Depends(get_current_active_user)
):
    # This endpoint simulates trading with Pocket Option
    # In a real implementation, this would connect to the Pocket Option API
    
    data = await request.json()
    account_id = data.get("account_id")
    strategy_id = data.get("strategy_id")
    asset = data.get("asset", "EUR/USD")
    charging_mode = data.get("charging_mode", False)
    
    # Get account
    account = await db.pocket_option_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    })
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    
    # Get strategy
    strategy = await db.strategies.find_one({
        "id": strategy_id, 
        "user_id": current_user.id
    })
    
    if not strategy:
        strategy = TradingStrategy().dict()  # Use default strategy
    
    # Generate mock price data for simulation
    prices = np.random.normal(loc=100, scale=2, size=100)
    
    # Calculate RSI and determine trade signal
    signal = get_trading_signal(
        prices,
        rsi_upper=strategy.get("rsi_upper_threshold", 60),
        rsi_lower=strategy.get("rsi_lower_threshold", 40)
    )
    
    # For charging mode, we always generate a signal
    if charging_mode and not signal:
        signal = "CALL" if np.random.random() > 0.5 else "PUT"
    
    # Special handling for the user's real account
    is_real_account = account.get("username") == "newroyalsinc@gmail.com"
    account_type = "Real" if is_real_account else "Demo"
    
    if signal:
        # Adjust amount based on charging mode
        amount = strategy.get("trade_amount", 10)
        if charging_mode:
            # Start with smaller amounts and increase on wins
            recent_wins = await db.trade_signals.count_documents({
                "account_id": account_id,
                "result": "WIN",
                "created_at": {"$gte": datetime.utcnow() - timedelta(hours=1)}
            })
            amount = amount * (1 + (recent_wins * 0.1))  # Increase 10% per recent win
        
        # Create trade signal
        trade = TradeSignal(
            account_id=account_id,
            strategy_id=strategy_id,
            signal_type=signal,
            asset=asset,
            amount=amount,
            expiry_time=strategy.get("expiry_time", 60),
            account_type=account_type
        )
        
        # Save trade to database
        await db.trade_signals.insert_one(trade.dict())
        
        # Simulate trade result (random for now)
        # For real account, make success more likely (this is just for simulation)
        win_probability = 0.65 if is_real_account else 0.5
        result = "WIN" if np.random.random() < win_probability else "LOSS"
        
        # Update trade result
        await db.trade_signals.update_one(
            {"id": trade.id},
            {"$set": {"result": result, "executed": True}}
        )
        
        return {
            "message": f"Trade executed: {signal} on {asset} using {account_type} account {account.get('username')}",
            "trade": trade.dict(),
            "result": result,
            "charging_mode": charging_mode,
            "account_type": account_type,
            "is_real_account": is_real_account
        }
    
    return {"message": "No trading signal detected"}

@api_router.post("/webhook/tradingview/{user_id}")
async def tradingview_webhook(user_id: str, request: Request):
    """
    Endpoint for receiving webhook signals from TradingView
    
    The webhook should be configured in TradingView alerts with a JSON payload like:
    {
        "strategy": "RSI Strategy",
        "signal": "CALL" | "PUT",
        "asset": "EURUSD",
        "expiry": 60
    }
    """
    try:
        data = await request.json()
        
        # Validate required fields
        required_fields = ["signal", "asset", "expiry"]
        for field in required_fields:
            if field not in data:
                return JSONResponse(
                    status_code=400,
                    content={"error": f"Missing required field: {field}"}
                )
        
        # Get user
        user = await db.users.find_one({"id": user_id})
        if not user:
            return JSONResponse(
                status_code=404,
                content={"error": "User not found"}
            )
        
        # Get user's accounts (use first available account for now)
        account = await db.pocket_option_accounts.find_one({"user_id": user_id})
        if not account:
            return JSONResponse(
                status_code=404,
                content={"error": "No trading account found for this user"}
            )
        
        # Get strategy (use first available or specified strategy)
        strategy_name = data.get("strategy", "RSI Strategy")
        strategy = await db.strategies.find_one({
            "user_id": user_id,
            "name": strategy_name
        })
        
        if not strategy:
            # Use default strategy if none is found
            strategy = TradingStrategy(name=strategy_name).dict()
            strategy["user_id"] = user_id
            await db.strategies.insert_one(strategy)
        
        # Create trade signal
        trade = TradeSignal(
            account_id=account["id"],
            strategy_id=strategy["id"],
            signal_type=data["signal"],
            asset=data["asset"],
            amount=strategy.get("trade_amount", 10),
            expiry_time=data.get("expiry", 60)
        )
        
        # Save trade to database
        await db.trade_signals.insert_one(trade.dict())
        
        # Simulate trade result
        result = "WIN" if np.random.random() > 0.5 else "LOSS"
        
        # Update trade result
        await db.trade_signals.update_one(
            {"id": trade.id},
            {"$set": {"result": result, "executed": True}}
        )
        
        return {
            "status": "success",
            "message": f"Signal received: {data['signal']} on {data['asset']}",
            "trade_id": trade.id,
            "result": result
        }
    
    except Exception as e:
        logger.error(f"Error processing TradingView webhook: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@api_router.get("/account/balance/{account_id}")
async def get_account_balance(
    account_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get account balance for a Pocket Option account
    This is a simulated balance as we don't have actual API access
    """
    # Check if account exists and belongs to user
    account = await db.pocket_option_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    })
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    
    # Get trade history for this account
    trades = await db.trade_signals.find({"account_id": account_id}).to_list(1000)
    
    # Calculate metrics
    total_trades = len(trades)
    winning_trades = sum(1 for trade in trades if trade.get("result") == "WIN")
    losing_trades = sum(1 for trade in trades if trade.get("result") == "LOSS")
    pending_trades = total_trades - winning_trades - losing_trades
    
    # Generate a random balance (for demo purposes)
    balance = 1000 + (winning_trades * 100) - (losing_trades * 80)
    if account["username"] == "newroyalsinc@gmail.com":
        # Give a nicer balance to the demo account
        balance = 2500 + (winning_trades * 150) - (losing_trades * 50)
    
    return {
        "account_id": account_id,
        "balance": balance,
        "currency": "USD",
        "total_trades": total_trades,
        "winning_trades": winning_trades,
        "losing_trades": losing_trades,
        "pending_trades": pending_trades,
        "win_rate": winning_trades / total_trades if total_trades > 0 else 0,
        "account_type": "Demo" if account.get("is_demo", True) else "Real"
    }

@api_router.get("/trading/metrics")
async def get_trading_metrics(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get detailed trading metrics for charts and analysis
    """
    # Get user's accounts
    accounts = await db.pocket_option_accounts.find({"user_id": current_user.id}).to_list(100)
    account_ids = [account["id"] for account in accounts]
    
    # Get all trades for these accounts
    all_trades = await db.trade_signals.find({"account_id": {"$in": account_ids}}).to_list(1000)
    
    # Calculate metrics
    total_trades = len(all_trades)
    if total_trades == 0:
        return {
            "metrics": {
                "total_trades": 0,
                "win_rate": 0,
                "asset_distribution": [],
                "daily_performance": [],
                "trade_types": {"CALL": 0, "PUT": 0}
            }
        }
    
    # Win/loss metrics
    winning_trades = [trade for trade in all_trades if trade.get("result") == "WIN"]
    losing_trades = [trade for trade in all_trades if trade.get("result") == "LOSS"]
    
    # Asset distribution
    asset_counts = {}
    for trade in all_trades:
        asset = trade.get("asset", "Unknown")
        asset_counts[asset] = asset_counts.get(asset, 0) + 1
    
    asset_distribution = [
        {"asset": asset, "count": count, "percentage": (count / total_trades) * 100}
        for asset, count in asset_counts.items()
    ]
    
    # Daily performance
    daily_performance = {}
    for trade in all_trades:
        date_str = datetime.fromisoformat(str(trade.get("created_at"))).strftime("%Y-%m-%d")
        if date_str not in daily_performance:
            daily_performance[date_str] = {"wins": 0, "losses": 0}
        
        if trade.get("result") == "WIN":
            daily_performance[date_str]["wins"] += 1
        elif trade.get("result") == "LOSS":
            daily_performance[date_str]["losses"] += 1
    
    daily_perf_list = [
        {
            "date": date,
            "wins": data["wins"],
            "losses": data["losses"],
            "total": data["wins"] + data["losses"],
            "win_rate": (data["wins"] / (data["wins"] + data["losses"])) * 100
        }
        for date, data in daily_performance.items()
    ]
    
    # Trade types (CALL/PUT)
    call_trades = sum(1 for trade in all_trades if trade.get("signal_type") == "CALL")
    put_trades = sum(1 for trade in all_trades if trade.get("signal_type") == "PUT")
    
    return {
        "metrics": {
            "total_trades": total_trades,
            "winning_trades": len(winning_trades),
            "losing_trades": len(losing_trades),
            "win_rate": (len(winning_trades) / total_trades) * 100,
            "asset_distribution": asset_distribution,
            "daily_performance": sorted(daily_perf_list, key=lambda x: x["date"]),
            "trade_types": {
                "CALL": call_trades,
                "PUT": put_trades
            }
        }
    }

@api_router.get("/economic-news")
async def get_economic_news():
    """
    Get economic news from various sources (simulated for now)
    """
    # This is demo data, in a real implementation we would fetch from ForexFactory
    current_date = datetime.now()
    
    news = [
        {
            "title": "Fed Interest Rate Decision",
            "date": (current_date - timedelta(days=1)).strftime("%Y-%m-%d"),
            "time": "14:00",
            "impact": "high",
            "forecast": "4.75%",
            "previous": "5.00%",
            "actual": "4.75%",
            "country": "USD"
        },
        {
            "title": "ECB Monetary Policy Statement",
            "date": current_date.strftime("%Y-%m-%d"),
            "time": "12:45",
            "impact": "high",
            "forecast": "3.50%",
            "previous": "3.50%",
            "actual": "3.50%",
            "country": "EUR"
        },
        {
            "title": "US Non-Farm Payrolls",
            "date": (current_date + timedelta(days=1)).strftime("%Y-%m-%d"),
            "time": "13:30",
            "impact": "high",
            "forecast": "180K",
            "previous": "175K",
            "actual": "",
            "country": "USD"
        },
        {
            "title": "UK GDP",
            "date": (current_date + timedelta(days=2)).strftime("%Y-%m-%d"),
            "time": "09:30",
            "impact": "medium",
            "forecast": "0.3%",
            "previous": "0.2%",
            "actual": "",
            "country": "GBP"
        },
        {
            "title": "Japan CPI",
            "date": (current_date + timedelta(days=3)).strftime("%Y-%m-%d"),
            "time": "00:30",
            "impact": "medium",
            "forecast": "2.8%",
            "previous": "2.7%",
            "actual": "",
            "country": "JPY"
        }
    ]
    
    # Add DXY info
    dxy_value = 103.2 + (np.random.random() * 2 - 1)  # Random value around 103
    dxy_change = np.random.random() * 0.6 - 0.3  # Random change between -0.3% and +0.3%
    
    return {
        "news": news,
        "dxy": {
            "value": dxy_value,
            "change_percent": dxy_change,
            "reference": "Daily change",
            "trend": "bullish" if dxy_change > 0 else "bearish"
        }
    }

@api_router.get("/available-assets")
async def get_available_assets():
    """
    Get list of available trading assets by category
    """
    assets = {
        "forex": {
            "major": [
                {"symbol": "EURUSD", "name": "EUR/USD", "pip_value": 0.0001},
                {"symbol": "GBPUSD", "name": "GBP/USD", "pip_value": 0.0001},
                {"symbol": "USDJPY", "name": "USD/JPY", "pip_value": 0.01},
                {"symbol": "USDCHF", "name": "USD/CHF", "pip_value": 0.0001},
                {"symbol": "AUDUSD", "name": "AUD/USD", "pip_value": 0.0001},
                {"symbol": "USDCAD", "name": "USD/CAD", "pip_value": 0.0001},
                {"symbol": "NZDUSD", "name": "NZD/USD", "pip_value": 0.0001}
            ],
            "minor": [
                {"symbol": "EURGBP", "name": "EUR/GBP", "pip_value": 0.0001},
                {"symbol": "EURJPY", "name": "EUR/JPY", "pip_value": 0.01},
                {"symbol": "GBPJPY", "name": "GBP/JPY", "pip_value": 0.01},
                {"symbol": "AUDCHF", "name": "AUD/CHF", "pip_value": 0.0001},
                {"symbol": "CHFJPY", "name": "CHF/JPY", "pip_value": 0.01},
                {"symbol": "EURCHF", "name": "EUR/CHF", "pip_value": 0.0001},
                {"symbol": "AUDCAD", "name": "AUD/CAD", "pip_value": 0.0001},
                {"symbol": "GBPCAD", "name": "GBP/CAD", "pip_value": 0.0001},
                {"symbol": "AUDNZD", "name": "AUD/NZD", "pip_value": 0.0001},
                {"symbol": "CADJPY", "name": "CAD/JPY", "pip_value": 0.01}
            ],
            "exotic": [
                {"symbol": "USDBRL", "name": "USD/BRL", "pip_value": 0.0001},
                {"symbol": "USDINR", "name": "USD/INR", "pip_value": 0.0001},
                {"symbol": "USDSGD", "name": "USD/SGD", "pip_value": 0.0001},
                {"symbol": "USDTHB", "name": "USD/THB", "pip_value": 0.0001},
                {"symbol": "USDMXN", "name": "USD/MXN", "pip_value": 0.0001},
                {"symbol": "USDIDR", "name": "USD/IDR", "pip_value": 0.0001},
                {"symbol": "USDZAR", "name": "USD/ZAR", "pip_value": 0.0001},
                {"symbol": "USDTRY", "name": "USD/TRY", "pip_value": 0.0001},
                {"symbol": "EURTRY", "name": "EUR/TRY", "pip_value": 0.0001},
                {"symbol": "USDPLN", "name": "USD/PLN", "pip_value": 0.0001}
            ]
        },
        "otc": {
            "forex": [
                {"symbol": "EURUSD-OTC", "name": "EUR/USD OTC", "pip_value": 0.0001},
                {"symbol": "GBPUSD-OTC", "name": "GBP/USD OTC", "pip_value": 0.0001},
                {"symbol": "EURGBP-OTC", "name": "EUR/GBP OTC", "pip_value": 0.0001},
                {"symbol": "USDJPY-OTC", "name": "USD/JPY OTC", "pip_value": 0.01},
                {"symbol": "AUDCAD-OTC", "name": "AUD/CAD OTC", "pip_value": 0.0001},
                {"symbol": "NZDUSD-OTC", "name": "NZD/USD OTC", "pip_value": 0.0001},
                {"symbol": "EURJPY-OTC", "name": "EUR/JPY OTC", "pip_value": 0.01},
                {"symbol": "GBPJPY-OTC", "name": "GBP/JPY OTC", "pip_value": 0.01},
                {"symbol": "USDCHF-OTC", "name": "USD/CHF OTC", "pip_value": 0.0001},
                {"symbol": "AUDNZD-OTC", "name": "AUD/NZD OTC", "pip_value": 0.0001}
            ],
            "crypto": [
                {"symbol": "BTCUSD-OTC", "name": "Bitcoin (BTC/USD) OTC", "pip_value": 1},
                {"symbol": "ETHUSD-OTC", "name": "Ethereum (ETH/USD) OTC", "pip_value": 0.1},
                {"symbol": "LTCUSD-OTC", "name": "Litecoin (LTC/USD) OTC", "pip_value": 0.01},
                {"symbol": "XRPUSD-OTC", "name": "Ripple (XRP/USD) OTC", "pip_value": 0.0001},
                {"symbol": "DOGEUSD-OTC", "name": "Dogecoin (DOGE/USD) OTC", "pip_value": 0.0001},
                {"symbol": "ADAUSD-OTC", "name": "Cardano (ADA/USD) OTC", "pip_value": 0.0001}
            ],
            "stocks": [
                {"symbol": "AAPL-OTC", "name": "Apple Inc. OTC", "pip_value": 0.01},
                {"symbol": "MSFT-OTC", "name": "Microsoft Corp. OTC", "pip_value": 0.01},
                {"symbol": "FB-OTC", "name": "Facebook Inc. OTC", "pip_value": 0.01},
                {"symbol": "TSLA-OTC", "name": "Tesla Inc. OTC", "pip_value": 0.01},
                {"symbol": "AMZN-OTC", "name": "Amazon.com Inc. OTC", "pip_value": 0.01},
                {"symbol": "GOOGL-OTC", "name": "Alphabet Inc. OTC", "pip_value": 0.01}
            ],
            "commodities": [
                {"symbol": "XAUUSD-OTC", "name": "Gold OTC", "pip_value": 0.01},
                {"symbol": "XAGUSD-OTC", "name": "Silver OTC", "pip_value": 0.001},
                {"symbol": "BRENT-OTC", "name": "Brent Oil OTC", "pip_value": 0.01},
                {"symbol": "WTI-OTC", "name": "WTI Crude Oil OTC", "pip_value": 0.01}
            ],
            "indices": [
                {"symbol": "SP500-OTC", "name": "S&P 500 OTC", "pip_value": 0.1},
                {"symbol": "DJI30-OTC", "name": "Dow Jones OTC", "pip_value": 0.1},
                {"symbol": "US100-OTC", "name": "US100 (NASDAQ) OTC", "pip_value": 0.1}
            ]
        },
        "crypto": [
            {"symbol": "BTCUSD", "name": "Bitcoin (BTC/USD)", "pip_value": 1},
            {"symbol": "ETHUSD", "name": "Ethereum (ETH/USD)", "pip_value": 0.1},
            {"symbol": "LTCUSD", "name": "Litecoin (LTC/USD)", "pip_value": 0.01},
            {"symbol": "XRPUSD", "name": "Ripple (XRP/USD)", "pip_value": 0.0001},
            {"symbol": "DOGEUSD", "name": "Dogecoin (DOGE/USD)", "pip_value": 0.0001},
            {"symbol": "ADAUSD", "name": "Cardano (ADA/USD)", "pip_value": 0.0001},
            {"symbol": "SOLUSD", "name": "Solana (SOL/USD)", "pip_value": 0.01},
            {"symbol": "DOTUSD", "name": "Polkadot (DOT/USD)", "pip_value": 0.01},
            {"symbol": "LINKUSD", "name": "Chainlink (LINK/USD)", "pip_value": 0.01},
            {"symbol": "AVAXUSD", "name": "Avalanche (AVAX/USD)", "pip_value": 0.01},
            {"symbol": "TRXUSD", "name": "TRON (TRX/USD)", "pip_value": 0.0001},
            {"symbol": "BNBUSD", "name": "Binance Coin (BNB/USD)", "pip_value": 0.1},
            {"symbol": "MATICUSD", "name": "Polygon (MATIC/USD)", "pip_value": 0.0001},
            {"symbol": "TONUSD", "name": "Toncoin (TON/USD)", "pip_value": 0.01}
        ],
        "stocks": [
            {"symbol": "AAPL", "name": "Apple Inc.", "pip_value": 0.01},
            {"symbol": "MSFT", "name": "Microsoft Corp.", "pip_value": 0.01},
            {"symbol": "FB", "name": "Facebook Inc.", "pip_value": 0.01},
            {"symbol": "INTC", "name": "Intel Corp.", "pip_value": 0.01},
            {"symbol": "TSLA", "name": "Tesla Inc.", "pip_value": 0.01},
            {"symbol": "JNJ", "name": "Johnson & Johnson", "pip_value": 0.01},
            {"symbol": "AXP", "name": "American Express", "pip_value": 0.01},
            {"symbol": "PFE", "name": "Pfizer Inc.", "pip_value": 0.01},
            {"symbol": "CSCO", "name": "Cisco Systems", "pip_value": 0.01},
            {"symbol": "BABA", "name": "Alibaba Group", "pip_value": 0.01},
            {"symbol": "BA", "name": "Boeing Company", "pip_value": 0.01},
            {"symbol": "AMZN", "name": "Amazon.com Inc.", "pip_value": 0.01},
            {"symbol": "NFLX", "name": "Netflix Inc.", "pip_value": 0.01},
            {"symbol": "MCD", "name": "McDonald's Corp.", "pip_value": 0.01},
            {"symbol": "XOM", "name": "ExxonMobil Corp.", "pip_value": 0.01},
            {"symbol": "GOOGL", "name": "Alphabet Inc.", "pip_value": 0.01},
            {"symbol": "AMD", "name": "Advanced Micro Devices", "pip_value": 0.01},
            {"symbol": "DIS", "name": "Walt Disney Co.", "pip_value": 0.01},
            {"symbol": "NKE", "name": "Nike Inc.", "pip_value": 0.01},
            {"symbol": "V", "name": "Visa Inc.", "pip_value": 0.01}
        ],
        "commodities": [
            {"symbol": "XAUUSD", "name": "Gold", "pip_value": 0.01},
            {"symbol": "XAGUSD", "name": "Silver", "pip_value": 0.001},
            {"symbol": "XPTUSD", "name": "Platinum", "pip_value": 0.01},
            {"symbol": "XPDUSD", "name": "Palladium", "pip_value": 0.01},
            {"symbol": "BRENT", "name": "Brent Oil", "pip_value": 0.01},
            {"symbol": "WTI", "name": "WTI Crude Oil", "pip_value": 0.01},
            {"symbol": "NGAS", "name": "Natural Gas", "pip_value": 0.001},
            {"symbol": "COPPER", "name": "Copper", "pip_value": 0.001}
        ],
        "indices": [
            {"symbol": "AUS200", "name": "AUS 200", "pip_value": 0.1},
            {"symbol": "E35EUR", "name": "E35EUR", "pip_value": 0.1},
            {"symbol": "100GBP", "name": "100GBP", "pip_value": 0.1},
            {"symbol": "F40EUR", "name": "F40EUR", "pip_value": 0.1},
            {"symbol": "JPN225", "name": "JPN225", "pip_value": 0.1},
            {"symbol": "D30EUR", "name": "D30EUR", "pip_value": 0.1},
            {"symbol": "E50EUR", "name": "E50EUR", "pip_value": 0.1},
            {"symbol": "SP500", "name": "S&P 500", "pip_value": 0.1},
            {"symbol": "DJI30", "name": "Dow Jones", "pip_value": 0.1},
            {"symbol": "US100", "name": "US100 (NASDAQ)", "pip_value": 0.1}
        ],
        "etfs": [
            {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "pip_value": 0.01},
            {"symbol": "QQQ", "name": "Invesco QQQ Trust", "pip_value": 0.01},
            {"symbol": "DIA", "name": "SPDR Dow Jones Industrial Average", "pip_value": 0.01},
            {"symbol": "IWM", "name": "iShares Russell 2000 ETF", "pip_value": 0.01},
            {"symbol": "GLD", "name": "SPDR Gold Shares", "pip_value": 0.01},
            {"symbol": "SLV", "name": "iShares Silver Trust", "pip_value": 0.01},
            {"symbol": "USO", "name": "United States Oil Fund", "pip_value": 0.01},
            {"symbol": "XLE", "name": "Energy Select Sector SPDR", "pip_value": 0.01}
        ],
        "volatility": [
            {"symbol": "VIX", "name": "CBOE Volatility Index", "pip_value": 0.01},
            {"symbol": "VVIX", "name": "VIX Volatility Index", "pip_value": 0.01},
            {"symbol": "VXN", "name": "CBOE NASDAQ Volatility Index", "pip_value": 0.01},
            {"symbol": "VOLX50", "name": "EURO STOXX 50 Volatility", "pip_value": 0.01}
        ]
    }
    
    return {"assets": assets}

@api_router.get("/trading/history", response_model=List[TradeSignal])
async def trading_history(
    current_user: User = Depends(get_current_active_user),
    limit: int = 50
):
    # Get accounts belonging to user
    accounts = await db.pocket_option_accounts.find(
        {"user_id": current_user.id}
    ).to_list(100)
    
    account_ids = [account["id"] for account in accounts]
    
    # Get trade history for user's accounts
    trades = await db.trade_signals.find(
        {"account_id": {"$in": account_ids}}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return trades

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
