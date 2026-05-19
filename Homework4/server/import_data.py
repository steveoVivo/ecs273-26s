import os
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

# MongoDB connection (localhost, default port)
client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client.stock_steven_shoes

# TODO: Go over everything and error handle in the event that you fail to find a file
# TODO: Do you really need an 'await' in front of every insert?

tickers = [ 'XOM', 'CVX', 'HAL',
            'MMM', 'CAT', 'DAL',
            'MCD', 'NKE', 'KO',
            'JNJ', 'PFE', 'UNH',
            'JPM', 'GS', 'BAC',
            'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META']


stock_name_collection = db.get_collection("stock_list")
# - - - Function - - - #
# Store a list of tickers
async def import_tickers_to_mongodb():
    # Insert the tickers into the collection
    await stock_name_collection.insert_one({
        "tickers": tickers
    })

stock_price_collection = db.get_collection("stock_price")
# - - - Function - - - #
# Store a history of stock price data
# NOTE: Using StockModelV1
async def import_prices_to_mongodb():
    for ticker in tickers:
        price_dataframe = pd.read_csv('./data/stockdata/' + ticker + '.csv')
        price_dicts = price_dataframe.to_dict(orient='records')
        for dict in price_dicts:
            dict['name'] = ticker

        await stock_price_collection.insert_many(price_dicts)

stock_news_collection = db.get_collection("stock_news")
# - - - Function - - - #
# Store all stock news articles
async def import_news_to_mongodb():
    stocknews_path = './data/stocknews/'
    # Loop through all subfolders
    for ticker in tickers:
        tickernews_path = stocknews_path + ticker + '/'
        # Loop through all files in a subfolder
        for file_name in os.listdir(tickernews_path):
            if file_name.endswith('.txt'):
                with open(tickernews_path + file_name, 'r') as file:
                    # TODO: Error handle in case the 'Title' and 'Date' openers aren't here (IE, it's an invalid file)
                    # Remove 'Title: ' and 'Date: ' openers and trailing newline character
                    title = file.readline()
                    title_formatted = title[7:-1]
                    date = file.readline()
                    date_formatted = date[6:-1]

                    # Skip past URL and empty line
                    file.readline()
                    file.readline()

                    # Read in the rest of the file as the body content
                    content = file.read()
                    stocknews = {
                        "Stock": ticker,
                        "Title": title_formatted,
                        "Date": date_formatted,
                        "content": content
                    }

                    await stock_news_collection.insert_one(stocknews)

tsne_collection = db.get_collection("tsne")
# - - - Function - - - #
# Store tsne data
async def import_tsne_to_mongodb():
    tsne_dataframe = pd.read_csv('./data/tsne.csv')
    tsne_dicts = tsne_dataframe.to_dict(orient='records')
    for dict in tsne_dicts:
        tsne_data = {
            "Stock": dict["Ticker"],
            "x": dict["X"],
            "y": dict["Y"]
        }
        
        await tsne_collection.insert_one(tsne_data)

# - - - Main Function - - - #
# Import all data. Do this concurrently (gather) rather than in series (two awaits) to save time
async def import_all_data():
    await asyncio.gather(
        import_tickers_to_mongodb(),
        import_prices_to_mongodb(),
        import_news_to_mongodb(),
        import_tsne_to_mongodb()
    )

if __name__ == "__main__":
    asyncio.run(import_all_data())
