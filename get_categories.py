import os
from pymongo import MongoClient

mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
client = MongoClient(mongo_uri)
db = client.tracal_db
cats = db.homestays.distinct('category')
print('Distinct categories:', cats)
client.close()

