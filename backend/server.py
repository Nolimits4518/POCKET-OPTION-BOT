from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request
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
    # This endpoint simulates trading for demo purposes
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
            expiry_time=strategy.get("expiry_time", 60)
        )
        
        # Save trade to database
        await db.trade_signals.insert_one(trade.dict())
        
        # Simulate trade result (random for now)
        result = "WIN" if np.random.random() > 0.5 else "LOSS"
        
        # Update trade result
        await db.trade_signals.update_one(
            {"id": trade.id},
            {"$set": {"result": result, "executed": True}}
        )
        
        return {
            "message": f"Trade executed: {signal} on {asset}",
            "trade": trade.dict(),
            "result": result,
            "charging_mode": charging_mode
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
