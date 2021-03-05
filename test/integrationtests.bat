@echo off
set server=http://localhost:10001
set jsonHeader=--header "content-type: application/json"

echo Server: %server%
echo ___________________________________________________________
echo.
echo - cleanup
curl -X DELETE %server%/simple/projects/test1
curl -X DELETE %server%/simple/projects/test2
curl -X DELETE %server%/simple/projects/test3

echo __should be empty
curl -X GET %server%/simple/projects
echo. 
echo.


echo - add 3 projects
curl -X POST %server%/simple/projects %jsonHeader% -d "{\"name\": \"test1\"}"
curl -X POST %server%/simple/projects %jsonHeader% -d "{\"name\": \"test2\"}"
curl -X POST %server%/simple/projects %jsonHeader% -d "{\"name\": \"test3\"}"
echo.
echo.

echo - get projects (should list 3 projects)
curl -X GET %server%/simple/projects
echo.
echo.

echo - remove 3 projects
curl -X DELETE %server%/simple/projects/test1
curl -X DELETE %server%/simple/projects/test2
curl -X DELETE %server%/simple/projects/test3
echo.
echo.

echo - get projects (should be [])
curl -X GET %server%/simple/projects
echo.
echo.

echo add test1-project and table testtable1
curl -X POST %server%/simple/projects %jsonHeader% -d "{\"name\": \"test1\"}"
curl -X POST %server%/simple/projects/test1/stores/ %jsonHeader% -d "{\"name\": \"testtable1\" }"
curl -X GET %server%/simple/projects/test1/stores
echo.
echo.

echo remove test1.testtable1 and test1 project
curl -X DELETE %server%/simple/projects/test1/stores/testtable1
curl -X GET %server%/simple/projects/test1/stores
curl -X DELETE %server%/simple/projects/test1
echo.
echo.

echo add data (check without data and 3 values)
curl -X POST %server%/simple/projects %jsonHeader% -d "{\"name\": \"test1\"}"
curl -X POST %server%/simple/projects/test1/stores/ %jsonHeader% -d "{\"name\": \"testtable1\" }"
curl -X GET %server%/simple/projects/test1/stores/testtable1
curl -X POST %server%/simple/projects/test1/stores/testtable1
curl -X POST %server%/simple/projects/test1/stores/testtable1
curl -X POST %server%/simple/projects/test1/stores/testtable1
echo.
echo.

echo list data:
curl -X GET %server%/simple/projects/test1/stores/testtable1
echo.
echo.

echo add data (check with data and 3 values)
curl -X POST %server%/simple/projects/test1/stores/ %jsonHeader% -d "{\"name\": \"testtable2\", \"columns\": [{\"name\":\"key\",\"datatype\":\"varchar(100)\"}] }"
curl -X POST %server%/simple/projects/test1/stores/testtable2 %jsonHeader% -d "{\"key\": \"testkey1\"}"
curl -X POST %server%/simple/projects/test1/stores/testtable2 %jsonHeader% -d "{\"key\": \"testkey2\"}"
curl -X POST %server%/simple/projects/test1/stores/testtable2 %jsonHeader% -d "{\"key\": \"testkey3\"}"
echo.
echo.

echo list data:
curl -X GET %server%/simple/projects/test1/stores/testtable2
echo.
echo.

@echo on