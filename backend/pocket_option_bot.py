import time
import logging
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PocketOptionBot:
    def __init__(self, username, password, headless=True):
        """
        Initialize the Pocket Option trading bot
        
        Args:
            username (str): Pocket Option username/email
            password (str): Pocket Option password
            headless (bool): Run browser in headless mode
        """
        self.username = username
        self.password = password
        self.headless = headless
        self.driver = None
        self.is_logged_in = False
        
    def setup_driver(self):
        """Set up Chrome WebDriver with appropriate options"""
        try:
            chrome_options = Options()
            if self.headless:
                chrome_options.add_argument("--headless")
            
            # Add required arguments for running in Docker/container environment
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            
            # Install and setup ChromeDriver
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            logger.info("WebDriver set up successfully")
            return True
        except Exception as e:
            logger.error(f"Error setting up WebDriver: {str(e)}")
            return False
    
    def login(self):
        """Log in to Pocket Option"""
        if not self.driver:
            if not self.setup_driver():
                return False
                
        try:
            # Navigate to Pocket Option login page
            self.driver.get("https://pocketoption.com/en/login/")
            logger.info("Navigated to Pocket Option login page")
            
            # Wait for the login form to load
            username_field = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.NAME, "email"))
            )
            
            # Enter login credentials
            username_field.send_keys(self.username)
            self.driver.find_element(By.NAME, "password").send_keys(self.password)
            
            # Click login button
            self.driver.find_element(By.XPATH, "//button[@type='submit']").click()
            
            # Wait for successful login (dashboard element appears)
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".trading-platform"))
            )
            
            logger.info(f"Successfully logged in as {self.username}")
            self.is_logged_in = True
            return True
        except Exception as e:
            logger.error(f"Login failed: {str(e)}")
            return False
    
    def navigate_to_trading(self):
        """Navigate to the trading interface"""
        if not self.is_logged_in:
            if not self.login():
                return False
        
        try:
            # Navigate to the trading platform
            self.driver.get("https://pocketoption.com/en/cabinet/demo-quick-high-low/")
            time.sleep(3)  # Wait for page to load
            
            logger.info("Navigated to trading platform")
            return True
        except Exception as e:
            logger.error(f"Failed to navigate to trading platform: {str(e)}")
            return False
    
    def select_asset(self, asset):
        """
        Select an asset to trade
        
        Args:
            asset (str): Asset name/symbol to trade
        """
        try:
            # Click on asset selector
            asset_dropdown = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, ".asset-select"))
            )
            asset_dropdown.click()
            
            # Find and click the specific asset
            asset_element = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, f"//div[contains(@class, 'asset-item') and contains(text(), '{asset}')]"))
            )
            asset_element.click()
            
            logger.info(f"Selected asset: {asset}")
            return True
        except Exception as e:
            logger.error(f"Failed to select asset {asset}: {str(e)}")
            return False
    
    def set_expiry_time(self, seconds):
        """
        Set the expiry time for the trade
        
        Args:
            seconds (int): Expiry time in seconds
        """
        try:
            # Click on expiry time selector
            expiry_dropdown = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, ".expiration-select"))
            )
            expiry_dropdown.click()
            
            # Find and click the specific expiry time
            expiry_element = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, f"//div[contains(@class, 'expiration-item') and contains(text(), '{seconds}s')]"))
            )
            expiry_element.click()
            
            logger.info(f"Set expiry time to {seconds} seconds")
            return True
        except Exception as e:
            logger.error(f"Failed to set expiry time to {seconds} seconds: {str(e)}")
            return False
    
    def place_trade(self, direction, amount):
        """
        Place a trade
        
        Args:
            direction (str): 'CALL' or 'PUT'
            amount (float): Trade amount
        """
        try:
            # Set the trade amount
            amount_input = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".amount-input"))
            )
            amount_input.clear()
            amount_input.send_keys(str(amount))
            
            # Click the appropriate button based on direction
            if direction.upper() == "CALL":
                button_selector = ".btn-call"  # Green button for CALL
            else:  # PUT
                button_selector = ".btn-put"   # Red button for PUT
                
            trade_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, button_selector))
            )
            trade_button.click()
            
            logger.info(f"Placed {direction} trade for ${amount}")
            return True
        except Exception as e:
            logger.error(f"Failed to place {direction} trade: {str(e)}")
            return False
    
    def execute_trade(self, asset, direction, amount, expiry_seconds=60):
        """
        Execute a complete trade
        
        Args:
            asset (str): Asset to trade
            direction (str): 'CALL' or 'PUT'
            amount (float): Trade amount
            expiry_seconds (int): Expiry time in seconds
        
        Returns:
            bool: True if trade was successfully executed
        """
        if not self.navigate_to_trading():
            return False
            
        if not self.select_asset(asset):
            return False
            
        if not self.set_expiry_time(expiry_seconds):
            return False
            
        if not self.place_trade(direction, amount):
            return False
            
        logger.info(f"Successfully executed {direction} trade on {asset} for ${amount} with {expiry_seconds}s expiry")
        return True
        
    def close(self):
        """Close the browser and clean up"""
        if self.driver:
            self.driver.quit()
            logger.info("Browser closed")
