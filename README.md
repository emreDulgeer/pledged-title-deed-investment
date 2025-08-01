# Pledged Title Deed Investment Platform 

Pledged property investment platform.

## 🚀 Başlatmak için

```bash
git clone https://github.com/emreDulgeer/pledged-title-deed-investment.git
cd pledged-title-deed-investment
docker compose up --build
```
## 🧪 API Testi
Tüm endpoint’ler Postman Collection içinde tanımlı:

📁 misc/Pledged Platform.postman_collection.json

🔑 baseUrl: http://localhost:5000/api/v1
Klasör Yapısı
server/ → Backend (Express + Mongo + Docker)

misc/ → Postman Collection 

## Kullanılan Teknolojiler
Node.js (Express)

MongoDB (Mongoose)

Docker + Docker Compose

Role-based auth (FakeAuth middleware şimdilik authentication yazılmadığı için fakeAuth middleware kullanıyoruz)
## Ortam Değişkenleri (.env)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/pledged_platform
JWT_SECRET=change_me
NODE_ENV=development
```

## Postman Variables
```json
"baseUrl" : "http://localhost:5000/api/v1"
"propertyId" : "BU KISIMA VERITABANINDAN BIR PROPERTY ID VERİLMELİ"
```
