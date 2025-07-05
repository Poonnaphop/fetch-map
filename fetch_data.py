import requests
import json
import sys
import time
import hashlib
import os
import random

# API configuration must be provided by the calling code

CACHE_FILE = 'api_cache.json'

def get_cache_key(provinces, business_types, limit):
    key_str = json.dumps({
        'provinces': provinces,
        'business_types': business_types,
        'limit': limit
    }, sort_keys=True, ensure_ascii=False)
    return hashlib.md5(key_str.encode('utf-8')).hexdigest()

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except Exception:
                return {}
    return {}

def save_cache(cache):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def call_api(provinces=None, business_types=None, limit=20, api_url=None, api_token=None, business_category=None):
    """
    Fetch all pages of API data with 500ms delay between calls
    Adds local caching to avoid unnecessary API calls.
    
    Args:
        provinces (list): List of province names to search (default: ["นครราชสีมา"])
        business_types (list): List of business type codes (default: all accommodation types)
        limit (int): Number of items per page (default: 20)
        api_url (str): API endpoint URL (required)
        api_token (str): API authentication token (required)
        business_category (str): Business category like 'accommodation' or 'restaurant' (required)
    
    Returns:
        tuple: (api_response, pagination, sellers_info)
    """
    
    # Validate required API configuration
    if not api_url:
        raise ValueError("api_url is required")
    if not api_token:
        raise ValueError("api_token is required")
    if not business_category:
        raise ValueError("business_category is required (e.g., 'accommodation' or 'restaurant')")
    
    # Request headers with bearer token
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Content-Type': 'application/json'
    }
    
    # Default values
    if provinces is None:
        provinces = []
    
    if business_types is None:
         raise ValueError("business_types is required")
    
    # Caching logic
    cache = load_cache()
    cache_key = get_cache_key(provinces, business_types, limit)
    if cache_key in cache:
        print(f"[CACHE] Loading API data from cache: {CACHE_FILE} (key={cache_key})")
        cached = cache[cache_key]
        return cached['response_data'], cached['pagination'], cached['all_sellers_info']
    print(f"[API] Fetching data from API (no cache found for key={cache_key})...")
    
    # Request body template
    body_template = {
        "limit": limit,
        "businessType": business_types
    }
    
    # Only add province if provided
    if provinces:
        body_template["province"] = provinces
    
    print("Fetching all pages from API...")
    print("-" * 50)
    
    all_sellers_info = []
    current_page = 1
    total_pages = None
    total_items = 0
    
    try:
        while True:
            # Update page number
            body = body_template.copy()
            body["page"] = current_page
            print(f"Fetching page {current_page}...")
            print(f"Body: {body}")
            
            response = requests.post(api_url, headers=headers, json=body, verify=False)
            response_data = response.json()
            
            if not response_data.get('success') or not response_data.get('data'):
                print(f"Failed to fetch page {current_page}")
                break
            
            data = response_data['data']
            sellers = data.get('data', [])
            
            # Update pagination info on first page
            if current_page == 1:
                total_pages = data.get('totalPages')
                total_items = data.get('totalItems')
                print(f"Total pages: {total_pages}, Total items: {total_items}")
            
            # Process sellers from this page
            for seller in sellers:
                seller_info = {
                    'id': seller.get('id'),
                    'name_th': seller.get('nameTh'),
                    'name_en': seller.get('nameEn'),
                    'business_category': business_category,  # Add business category
                    'address': {
                        'no': seller.get('addressNo'),
                        'moo': seller.get('moo'),
                        'district': seller.get('district'),
                        'sub_district': seller.get('subDistrict'),
                        'province': seller.get('province'),
                        'postal_code': seller.get('postalCode')
                    },
                    'location': {
                        'longitude': seller.get('location', {}).get('coordinates', [])[0] if seller.get('location', {}).get('coordinates') else None,
                        'latitude': seller.get('location', {}).get('coordinates', [])[1] if seller.get('location', {}).get('coordinates') else None,
                        'type': seller.get('location', {}).get('type') if seller.get('location') else None
                    },
                    'contact': {
                        'mobile': seller.get('contactMobilePhoneNo'),
                        'email': seller.get('contactEmail'),
                        'additional': seller.get('contactAdditionalChannel'),
                        'website': seller.get('bizContactWebsite'),
                        'facebook': seller.get('bizContactFacebook'),
                        'instagram': seller.get('bizContactInstagram'),
                        'line': seller.get('bizContactLine')
                    },
                    'rooms': seller.get('rooms', []),
                    'images': seller.get('images', [])
                }
                all_sellers_info.append(seller_info)
            
            print(f"Page {current_page} of {total_pages}: Found {len(sellers)} sellers (Total so far: {len(all_sellers_info)})")
            
            # Check if there are more pages
            if not data.get('hasNextPage') or current_page >= total_pages:
                break
            
            # Wait 1000ms before next request
            random_wait = random.uniform(0.7, 1.5)
            print(f"Waiting {random_wait} seconds before next page...")
            time.sleep(random_wait)
            current_page += 1
        
        # Create final pagination info
        pagination = {
            'totalPages': total_pages,
            'totalItems': total_items,
            'pagesFetched': current_page,
            'totalSellers': len(all_sellers_info)
        }
        
        print("\n" + "="*50)
        print("EXTRACTED DATA:")
        print("="*50)
        print(f"Pagination: {pagination}")
        print(f"Total sellers found: {len(all_sellers_info)}")
        
        # Show summary of all sellers
        for i, seller in enumerate(all_sellers_info, 1):
            print(f"\nSeller {i}:")
            print(f"  Name (TH): {seller['name_th']}")
            print(f"  Name (EN): {seller['name_en']}")
            print(f"  Location: {seller['location']}")
            print(f"  📱 Mobile: {seller['contact']['mobile']}")
            
            # Calculate and log contact URLs
            contact_urls = {}
            
            # Website
            if seller['contact'].get('website'):
                website_url = seller['contact']['website']
                if not (website_url.startswith('http') or website_url.startswith('https')):
                    website_url = f"https://{website_url}"
                contact_urls['website'] = website_url
                print(f"  🌐 Website: {contact_urls['website']}")
            
            # Facebook
            if seller['contact'].get('facebook'):
                facebook_url = seller['contact']['facebook']
                if not ('facebook.com' in facebook_url or '.com' in facebook_url or '.co.th' in facebook_url or facebook_url.startswith('http') or facebook_url.startswith('https')):
                    facebook_url = f"https://www.facebook.com/{facebook_url}"
                contact_urls['facebook'] = facebook_url
                print(f"  📘 Facebook: {contact_urls['facebook']}")
            
            # Instagram
            if seller['contact'].get('instagram'):
                instagram_url = seller['contact']['instagram']
                if not ('instagram.com' in instagram_url or '.com' in instagram_url or '.co.th' in instagram_url or instagram_url.startswith('http') or instagram_url.startswith('https')):
                    instagram_url = f"https://www.instagram.com/{instagram_url}"
                contact_urls['instagram'] = instagram_url
                print(f"  📷 Instagram: {contact_urls['instagram']}")
            
            # Line
            if seller['contact'].get('line'):
                contact_urls['line'] = f"https://line.me/ti/p/{seller['contact']['line']}"
                print(f"  💬 Line: {contact_urls['line']}")
            
            # Add calculated URLs to seller data
            seller['contact_urls'] = contact_urls
            
            print(f"  🏠 Number of rooms: {len(seller['rooms'])}")
            print(f"  📸 Number of images: {len(seller['images'])}")
        
        print("="*50)
        
        # Save to cache
        cache[cache_key] = {
            'response_data': response_data,
            'pagination': pagination,
            'all_sellers_info': all_sellers_info
        }
        save_cache(cache)
        print(f"API data cached to {CACHE_FILE} (key={cache_key})")
        
        # Return the data for use in other modules
        return response_data, pagination, all_sellers_info
            
    except Exception as e:
        print(f"Exception occurred: {e}")
        return None, None, None

# if __name__ == "__main__":
#     # Set UTF-8 encoding for stdout to handle Thai characters
#     sys.stdout.reconfigure(encoding='utf-8')
#     call_api()








