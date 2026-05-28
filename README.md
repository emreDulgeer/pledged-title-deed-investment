# Pledged Title Deed Investment Platform 

Pledged property investment platform.

## 🚀 Başlatmak için

```bash
git clone https://github.com/emreDulgeer/pledged-title-deed-investment.git
cd pledged-title-deed-investment
docker compose up --build
```

## QA Ortamı

Standart QA verisini Mongo + MinIO + seed data ile tek komutta ayağa kaldırmak için:

```bash
./scripts/qa-env.sh
```

Bu komut şunları yapar:

- MongoDB ve MinIO servislerini başlatır
- MinIO `uploads` bucket'ını hazırlar
- mevcut seed yapısını QA env dosyasıyla çalıştırır
- herkes için aynı test datasını tekrar üretir

Sık kullanılan komutlar:

```bash
./scripts/qa-env.sh reset
./scripts/qa-env.sh status
./scripts/qa-env.sh down
```

Seed için kullanılan ortak env dosyası:

`server/config/env/qa.env.sample`
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
PORT=Port
MONGO_URI=URL
JWT_SECRET=JWT Secret
NODE_ENV=Env
```

## Postman Variables
```json
"baseUrl" : "http://localhost:5000/api/v1"
"propertyId" : "BU KISIMA VERITABANINDAN BIR PROPERTY ID VERİLMELİ"
```
