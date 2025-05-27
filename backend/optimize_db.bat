@echo off
setlocal enabledelayedexpansion

echo 🚀 GinChat Database Optimization
echo =================================

REM Check if we're in the backend directory
if not exist ".env" (
    echo ❌ Error: .env file not found
    echo Please run this script from the backend directory:
    echo cd backend ^&^& optimize_db.bat
    pause
    exit /b 1
)

echo 📄 Loading environment from .env...

REM Load environment variables from .env file
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" (
        set "%%a=%%b"
    )
)

REM Check if MONGO_URI is loaded
if "!MONGO_URI!"=="" (
    echo ❌ Error: MONGO_URI not found in .env file
    echo Please ensure your .env file contains:
    echo MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
    pause
    exit /b 1
)

echo ✅ Environment loaded successfully
echo 🔗 MongoDB: !MONGO_URI:~0,30!...

REM Set MONGODB_URI for the Go script
set "MONGODB_URI=!MONGO_URI!"

REM Navigate to scripts directory
cd scripts

echo 📁 Entering scripts directory...

REM Check if Go is installed
go version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Go is not installed
    echo Please install Go from https://golang.org/dl/
    pause
    exit /b 1
)

echo ✅ Go found
go version

REM Initialize Go module if needed
if not exist "go.mod" (
    echo 📦 Initializing Go module...
    go mod init add_indexes
)

REM Install dependencies
echo 📦 Installing dependencies...
go mod tidy

REM Run the optimization
echo.
echo 🔧 Running database optimization...
echo =================================

go run add_indexes.go

REM Check result
if errorlevel 1 (
    echo.
    echo ❌ Optimization failed. Please check the errors above.
    pause
    exit /b 1
) else (
    echo.
    echo 🎉 Database optimization completed!
    echo Your GinChat backend is now optimized for maximum performance.
    pause
)
