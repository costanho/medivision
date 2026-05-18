from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, Tuple
import hashlib
import secrets
import os

router = APIRouter()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# In-memory token store (replace with Redis in production)
active_tokens = {}


class UserLogin(BaseModel):
    """Login credentials"""
    username: str
    password: str


class Token(BaseModel):
    """Token response"""
    access_token: str
    token_type: str
    expires_in: int


class UserInfo(BaseModel):
    """User information"""
    username: str
    role: str
    name: str


# Mock user database (replace with real database)
MOCK_USERS = {
    "doctor1": {"password": "password123", "role": "doctor", "name": "Dr. Smith"},
    "admin1": {"password": "admin123", "role": "admin", "name": "Administrator"},
    "doctor2": {"password": "doctor123", "role": "doctor", "name": "Dr. Johnson"}
}


def hash_password(password: str) -> str:
    """Hash a password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


def create_access_token(username: str) -> Tuple[str, int]:
    """
    Create access token.

    Args:
        username: Username

    Returns:
        tuple: (token, expiration_seconds)
    """
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    active_tokens[token] = {
        "username": username,
        "expires_at": expires_at
    }
    return token, ACCESS_TOKEN_EXPIRE_MINUTES * 60


def verify_token(authorization: Optional[str] = Header(None)) -> str:
    """
    Verify access token from Authorization header.

    Args:
        authorization: Authorization header with format "Bearer {token}"

    Returns:
        str: Username

    Raises:
        HTTPException: Invalid or expired token
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid scheme")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Use: Bearer {token}"
        )

    # Check token validity
    if token not in active_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    token_data = active_tokens[token]

    # Check expiration
    if datetime.utcnow() > token_data["expires_at"]:
        del active_tokens[token]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )

    return token_data["username"]


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """
    Authenticate user and return access token.

    Args:
        credentials: Username and password

    Returns:
        Token: Access token with expiration

    Raises:
        HTTPException: Invalid credentials
    """
    user = MOCK_USERS.get(credentials.username)
    if not user or user["password"] != credentials.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    access_token, expires_in = create_access_token(credentials.username)

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in
    )


@router.get("/verify", response_model=UserInfo)
async def verify_auth(username: str = Depends(verify_token)):
    """
    Verify token validity and get user info.

    Args:
        username: Current user (from token)

    Returns:
        UserInfo: User details
    """
    user = MOCK_USERS.get(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserInfo(
        username=username,
        role=user.get("role", "user"),
        name=user.get("name", username)
    )


@router.post("/logout")
async def logout(
    authorization: Optional[str] = Header(None),
    username: str = Depends(verify_token)
):
    """
    Logout user (revoke token).

    Args:
        authorization: Authorization header
        username: Current user

    Returns:
        dict: Logout confirmation
    """
    try:
        scheme, token = authorization.split()
        if token in active_tokens:
            del active_tokens[token]
    except (ValueError, AttributeError):
        pass

    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserInfo)
async def get_current_user(username: str = Depends(verify_token)):
    """
    Get current authenticated user info.

    Args:
        username: Current user (from token)

    Returns:
        UserInfo: User details
    """
    user = MOCK_USERS.get(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserInfo(
        username=username,
        role=user.get("role", "user"),
        name=user.get("name", username)
    )
