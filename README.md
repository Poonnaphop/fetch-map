# 🗺️ Sellers Map Generator

A Python application that fetches accommodation and restaurant data from an API and creates an interactive Google Maps visualization with markers for all locations.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy the example environment file and add your API credentials:

```bash
cp .env.example .env
```

Then edit `.env` file with your actual API token:
```env
API_URL=http://backend-api.tat.or.th/mobile/buyer/booking/sellers
API_TOKEN=your_actual_api_token_here
```

### 3. Configure Search Parameters
Edit `main.py` to customize your search:

```python
# 🎯 TARGET LOCATION (Your desired location)
TARGET_LATITUDE = 14.4428927
TARGET_LONGITUDE = 101.3728028

# 📍 SEARCH PROVINCES (Thai province names)
SEARCH_PROVINCES = [
    "นครราชสีมา",
    "นครนายก", 
    "ปราจีนบุรี"
]

# 🏨 ACCOMMODATION BUSINESS TYPES
ACCOMMODATION_TYPES = [
    "500040001",  # โรงแรม 
    "500040002",  # โฮมเสตย์ 
    "500040003",  # รีสอร์ท 
    "500040004",  # ที่พักรายวัน 
]

# 🍽️ RESTAURANT BUSINESS TYPES (comment out to disable)
RESTAURANT_TYPES = [
    # "50001",  # ร้านอาหาร 
]
```

### 4. Run the Application
```bash
python main.py
```

## 📁 Files Structure

- `main.py` - Main configuration and execution file
- `fetch_data.py` - API data fetching functionality
- `run_maps.py` - Map creation and visualization
- `.env` - Environment variables (API credentials)
- `.env.example` - Example environment file
- `requirements.txt` - Python dependencies

## 🔧 Configuration Options

### API Configuration
- `API_URL` - The API endpoint URL
- `API_TOKEN` - Your authentication token

### Search Parameters
- `TARGET_LATITUDE/LONGITUDE` - Your target location coordinates
- `SEARCH_PROVINCES` - List of Thai provinces to search
- `ACCOMMODATION_TYPES` - Business type codes for accommodations
- `RESTAURANT_TYPES` - Business type codes for restaurants

### Map Settings
- `MAP_ZOOM_START` - Initial zoom level (1-18)
- `OUTPUT_FILENAME` - Output HTML file name
- `ACCOMMODATION_LIMIT` - Number of accommodation results
- `RESTAURANT_LIMIT` - Number of restaurant results

## 🗺️ Map Features

- 🎯 **Blue marker**: Your target location
- 🏨 **Red markers**: Accommodations (hotels, resorts, etc.)
- 🍽️ **Green markers**: Restaurants
- 📸 **Click markers**: See detailed information with images
- 🛰️ **Multiple layers**: Street, Satellite, Terrain, Hybrid views
- 🔍 **Auto-centered**: Automatically centers on all locations

## 🔒 Security

- API credentials are stored in `.env` file (not committed to git)
- `.env` file is ignored by version control
- Use `.env.example` as a template for your configuration

## 📝 Usage Tips

1. **Disable Restaurant Search**: Comment out `RESTAURANT_TYPES` to only show accommodations
2. **Add More Provinces**: Add more Thai province names to `SEARCH_PROVINCES`
3. **Adjust Limits**: Change `ACCOMMODATION_LIMIT` and `RESTAURANT_LIMIT` for more/fewer results
4. **Customize Zoom**: Adjust `MAP_ZOOM_START` for different initial zoom levels

## 🐛 Troubleshooting

- **"API_TOKEN not found"**: Make sure your `.env` file exists and contains the correct API token
- **"No seller data available"**: Check your API credentials and network connection
- **Empty map**: Verify your search parameters and target location coordinates 