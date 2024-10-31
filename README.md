# gfarm-http-gateway
HTTP gateway for Gfarm


## for developer

### FastAPI:

cd api
(use gunicorn (--reload cannot be used))
gunicorn -w 4 -k uvicorn.workers.UvicornWorker gfarm_api:app

(use uvicorn)
uvicorn gfarm_api:app --reload

### Web UI: (TODO)

(initialize)
npx create-react-app ui
cd ui
npm:
  npm start
  npm install axios
yarn:
  yarn start
  yarn add axios
