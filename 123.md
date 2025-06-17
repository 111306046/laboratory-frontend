# IOT-backend

## Before starting, you need to download something...

- python(3.12.8)
- poetry
- mongoDB

## How to use

1. Create virtual environment

```
poetry env use python
```

2. Install dependency

```
poetry install
```

3. Start the server

a. dev mode

```
poetry run python run.py --dev
```

b. prod mode

```
poetry run python run.py --prod
```

## API

- login("http://13.211.240.55/api/login")

```json
{
  "account": "string",
  "password": "string"
}
```

if successful, it will return

```json
{
  "access_token": "string"
}
```

- createUser("http://13.211.240.55/api/createUser")

```json
{
    "account":"string",
    "password":"string",
    "func_permissions":"string"[],
    "company":"string"
}
```

if successful, it will return

```json
{
  "message": "新增成功"
}
```

- modifyPermissions("http://13.211.240.55/api/modifyPermissions")

```json
{
    "account":"string",
    "func_permissions":"string"[]
}
```

- getUsers("http://13.211.240.55/api/getUsers")

## Useful link

- [fastapi](https://ithelp.ithome.com.tw/articles/10320028)
- [poetry](https://blog.kyomind.tw/python-poetry/)
- [poetry](https://realnewbie.com/coding/python/python-poetry/)
- [uvicorn](https://realnewbie.com/coding/python/introduction-to-uvicorn-high-performance-asgi-server/)
