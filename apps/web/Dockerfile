FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy prisma schema first (needed for install)
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
