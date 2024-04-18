docker build -t 192.168.49.2:5000/apiserver:latest . && ^
docker push 192.168.49.2:5000/apiserver:latest && ^
kubectl rollout restart deployment/k8s-api-deployment