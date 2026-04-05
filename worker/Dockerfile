FROM node:18-alpine

RUN apk add --no-cache curl ffmpeg

WORKDIR /app

COPY package*.json ./

RUN npm install 

# RUN npm cache clean --force

COPY . .

RUN npm run build

EXPOSE 3002

CMD ["npm", "run", "dev"]
