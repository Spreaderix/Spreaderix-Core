curl -X POST http://localhost:10001/simple/projects --header "content-type: application/json" -d "{\"name\": \"test1\"}"
curl -X POST http://localhost:10001/simple/projects --header "content-type: application/json" -d "{\"name\": \"test2\"}"
curl -X POST http://localhost:10001/simple/projects --header "content-type: application/json" -d "{\"name\": \"test3\"}"

curl -X DELETE http://localhost:10001/simple/projects/test2
curl -X DELETE http://localhost:10001/simple/projects/test3
