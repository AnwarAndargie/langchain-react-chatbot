from fastapi import APIRouter

router = APIRouter()


@router.post("/login")
async def login():
    """User login endpoint"""
    pass


@router.post("/register")
async def register():
    """User registration endpoint"""
    pass


@router.post("/logout")
async def logout():
    """User logout endpoint"""
    pass
