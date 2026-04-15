@echo off
echo Running Prisma Generate...
call npx prisma generate
echo Prisma Generate finished with exit code %ERRORLEVEL%
