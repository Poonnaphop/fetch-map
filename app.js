// Global variables
let map = null;
let markers = [];
let apiCallCount = 0;
let totalExpectedPages = 0;
let currentPage = 0;
let cacheHits = 0;
let cacheMisses = 0;

// User preferences storage
const USER_PREFERENCES_KEY = 'map_generator_preferences';

// Save user preferences
function saveUserPreferences() {
    try {
        const preferences = {
            apiUrl: document.getElementById('apiUrl').value,
            apiToken: document.getElementById('apiToken').value,
            targetLat: document.getElementById('targetLat').value,
            targetLon: document.getElementById('targetLon').value,
            mapStyle: document.getElementById('mapStyle').value,
            searchProvinces: document.getElementById('searchProvinces').value,
            accommodationTypes: Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                .filter(checkbox => ['hotel', 'homestay', 'resort', 'daily', 'hostel', 'mansion'].includes(checkbox.id))
                .map(checkbox => checkbox.id),
            restaurantTypes: Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                .filter(checkbox => checkbox.id === 'restaurant')
                .map(checkbox => checkbox.id)
        };
        
        localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences));
        console.log('User preferences saved');
    } catch (error) {
        console.error('Error saving preferences:', error);
    }
}

// Load user preferences
function loadUserPreferences() {
    try {
        const saved = localStorage.getItem(USER_PREFERENCES_KEY);
        if (!saved) return;
        
        const preferences = JSON.parse(saved);
        
        // Restore form values
        if (preferences.apiUrl) document.getElementById('apiUrl').value = preferences.apiUrl;
        if (preferences.apiToken) document.getElementById('apiToken').value = preferences.apiToken;
        if (preferences.targetLat) document.getElementById('targetLat').value = preferences.targetLat;
        if (preferences.targetLon) document.getElementById('targetLon').value = preferences.targetLon;
        if (preferences.mapStyle) document.getElementById('mapStyle').value = preferences.mapStyle;
        if (preferences.searchProvinces) document.getElementById('searchProvinces').value = preferences.searchProvinces;
        
        // Restore accommodation checkboxes
        if (preferences.accommodationTypes) {
            preferences.accommodationTypes.forEach(type => {
                const checkbox = document.getElementById(type);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        // Restore restaurant checkboxes
        if (preferences.restaurantTypes) {
            preferences.restaurantTypes.forEach(type => {
                const checkbox = document.getElementById(type);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        console.log('User preferences loaded');
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Load user preferences on page load
    loadUserPreferences();
    
    // Update zoom value display
    const zoomSlider = document.getElementById('mapZoom');
    const zoomValue = document.getElementById('zoomValue');
    
    if (zoomSlider && zoomValue) {
        zoomSlider.addEventListener('input', function() {
            zoomValue.textContent = this.value;
        });
    }

    // Handle form submission
    const form = document.getElementById('mapForm');
    form.addEventListener('submit', handleFormSubmit);

    // Handle clear all provinces
    const clearAllProvincesBtn = document.getElementById('clearAllProvincesBtn');
    if (clearAllProvincesBtn) {
        clearAllProvincesBtn.addEventListener('click', clearAllProvinces);
    }

    // Handle add common provinces
    const addCommonProvincesBtn = document.getElementById('addCommonProvincesBtn');
    if (addCommonProvincesBtn) {
        addCommonProvincesBtn.addEventListener('click', addCommonProvinces);
    }

    // Handle format provinces
    const formatProvincesBtn = document.getElementById('formatProvincesBtn');
    if (formatProvincesBtn) {
        formatProvincesBtn.addEventListener('click', formatProvinces);
    }

    // Handle real-time token validation
    const apiTokenInput = document.getElementById('apiToken');
    if (apiTokenInput) {
        apiTokenInput.addEventListener('input', debounce(validateTokenOnInput, 500));
    }
    
    // Cache management event listeners
    const cacheStatsBtn = document.getElementById('cacheStatsBtn');
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    
    if (cacheStatsBtn) {
        cacheStatsBtn.addEventListener('click', showCacheStats);
    }
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', clearAllCache);
    }
    
    // Clear preferences button
    const clearPreferencesBtn = document.getElementById('clearPreferencesBtn');
    if (clearPreferencesBtn) {
        clearPreferencesBtn.addEventListener('click', clearUserPreferences);
    }
    
    // Add map style switcher event listeners
    document.addEventListener('click', function(e) {
        if (e.target.closest('#mapStyleSwitcher button')) {
            const button = e.target.closest('#mapStyleSwitcher button');
            const style = button.getAttribute('data-style');
            if (style) {
                switchMapStyle(style);
            }
        }
    });
});

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Show loading
    showLoading();
    hideResults();
    
    // Hide map style switcher during loading
    const mapStyleSwitcher = document.getElementById('mapStyleSwitcher');
    if (mapStyleSwitcher) {
        mapStyleSwitcher.style.display = 'none';
    }
    
    try {
        // Get form data
        const formData = getFormData();
        
        // Validate form data
        if (!validateFormData(formData)) {
            return;
        }
        
        // Update progress for token validation
        let progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = 'Validating API token...';
        }
        
        // Validate API token
        validateApiToken(formData.apiUrl, formData.apiToken);
        
        // Fetch data from API
        const sellersData = await fetchAllData(formData);
        
        if (sellersData.length === 0) {
            showError('No data found. Please check your API credentials and search parameters.');
            return;
        }
        
        // Update progress for map generation
        progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = 'Generating interactive map...';
        }
        
        // Generate map
        generateMap(sellersData, formData);
        
        // Show results
        showResults();
        updateStats(sellersData);
        
        // Save user preferences after successful map generation
        saveUserPreferences();
        
    } catch (error) {
        console.error('Error:', error);
        showError('An error occurred while generating the map. Please check your API credentials and try again.');
    } finally {
        hideLoading();
    }
}

// Get form data
function getFormData() {
    const accommodationTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
        .filter(checkbox => ['hotel', 'homestay', 'resort', 'daily', 'hostel', 'mansion'].includes(checkbox.id))
        .map(checkbox => checkbox.value);
    
    const restaurantTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
        .filter(checkbox => checkbox.id === 'restaurant')
        .map(checkbox => checkbox.value);
    
    // Get provinces from textarea (one per line)
    const provincesText = document.getElementById('searchProvinces').value.trim();
    const provinces = provincesText ? provincesText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0) : [];
    
    return {
        apiUrl: document.getElementById('apiUrl').value.trim(),
        apiToken: document.getElementById('apiToken').value.trim(),
        targetLat: parseFloat(document.getElementById('targetLat').value),
        targetLon: parseFloat(document.getElementById('targetLon').value),
        zoomLevel: 10, // Default zoom level since mapZoom element was removed
        mapStyle: document.getElementById('mapStyle').value,
        provinces: provinces,
        accommodationTypes: accommodationTypes,
        restaurantTypes: restaurantTypes
    };
}

// Validate form data
function validateFormData(data) {
    if (!data.apiUrl) {
        showError('Please enter an API URL');
        return false;
    }
    
    if (!data.apiToken) {
        showError('Please enter an API token');
        return false;
    }
    
    if (isNaN(data.targetLat) || isNaN(data.targetLon)) {
        showError('Please enter valid coordinates');
        return false;
    }
    
    if (data.provinces.length === 0) {
        showError('Please select at least one province');
        return false;
    }
    
    if (data.accommodationTypes.length === 0 && data.restaurantTypes.length === 0) {
        showError('Please select at least one business type');
        return false;
    }
    
    return true;
}

// Validate JWT token by checking its structure and expiration
function validateApiToken(apiUrl, apiToken) {
    try {
        console.log('Validating API token...');
        
        // Check if token is provided
        if (!apiToken || apiToken.trim() === '') {
            throw new Error('API token is required');
        }
        
        // Check if token looks like a JWT (has 3 parts separated by dots)
        const tokenParts = apiToken.split('.');
        if (tokenParts.length !== 3) {
            throw new Error('Invalid token format. Expected JWT token with 3 parts.');
        }
        
        // Try to decode the payload (second part)
        let payload;
        try {
            // Base64 decode the payload
            const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            payload = JSON.parse(jsonPayload);
        } catch (decodeError) {
            throw new Error('Invalid token format. Cannot decode token payload.');
        }
        
        // Check if token has required fields
        if (!payload.exp) {
            throw new Error('Token does not contain expiration information.');
        }
        
        // Check token expiration
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp < currentTime) {
            const expirationDate = new Date(payload.exp * 1000);
            throw new Error(`Token has expired on ${expirationDate.toLocaleString()}. Please get a new token.`);
        }
        
        // Check if token will expire soon (within 1 hour)
        const oneHourFromNow = currentTime + (60 * 60);
        if (payload.exp < oneHourFromNow) {
            const expirationDate = new Date(payload.exp * 1000);
            console.warn(`Token will expire soon on ${expirationDate.toLocaleString()}`);
        }
        
        // Log token information (without sensitive data)
        console.log('Token validation successful');
        console.log('Token expires:', new Date(payload.exp * 1000).toLocaleString());
        if (payload.iat) {
            console.log('Token issued:', new Date(payload.iat * 1000).toLocaleString());
        }
        
        return true;
        
    } catch (error) {
        console.error('Token validation failed:', error);
        throw error;
    }
}

// Fetch all data from API with caching
async function fetchAllData(formData) {
    const allSellers = [];
    
    // Fetch accommodation data
    if (formData.accommodationTypes.length > 0) {
        console.log('Fetching accommodation data...');
        const accommodationData = await fetchDataFromAPIWithCache(
            formData.apiUrl,
            formData.apiToken,
            formData.provinces,
            formData.accommodationTypes,
            'accommodation'
        );
        allSellers.push(...accommodationData);
    }
    
    // Fetch restaurant data
    if (formData.restaurantTypes.length > 0) {
        console.log('Fetching restaurant data...');
        const restaurantData = await fetchDataFromAPIWithCache(
            formData.apiUrl,
            formData.apiToken,
            formData.provinces,
            formData.restaurantTypes,
            'restaurant'
        );
        allSellers.push(...restaurantData);
    }
    
    return allSellers;
}

// Fetch data from API with caching
async function fetchDataFromAPIWithCache(apiUrl, apiToken, provinces, businessTypes, businessCategory) {
    // Generate cache key
    const cacheKey = generateCacheKey(apiUrl, provinces, businessTypes, businessCategory);
    
    // Try to get cached data first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        console.log(`Using cached data for ${businessCategory}: ${cachedData.length} sellers`);
        
        // Update progress for cache hit
        let progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = `Using cached ${businessCategory} data (${cachedData.length} sellers)`;
        }
        
        return cachedData;
    }
    
    console.log(`Cache miss for ${businessCategory}, fetching from API...`);
    cacheMisses++;
    
    // Update progress for API fetching
    let progressText = document.getElementById('progressText');
    if (progressText) {
        progressText.textContent = `Fetching ${businessCategory} data from API...`;
    }
    
    // Fetch fresh data from API
    const freshData = await fetchDataFromAPI(apiUrl, apiToken, provinces, businessTypes, businessCategory);
    
    // Cache the fresh data
    setCachedData(cacheKey, freshData);
    
    return freshData;
}

// Fetch data from API with pagination
async function fetchDataFromAPI(apiUrl, apiToken, provinces, businessTypes, businessCategory) {
    const headers = {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
    };
    
    const sellers = [];
    let currentPage = 1;
    let totalPages = null;
    
    try {
        while (true) {
            const body = {
                limit: 20,
                page: currentPage,
                businessType: businessTypes
            };
            
            if (provinces.length > 0) {
                body.province = provinces;
            }
            
            console.log(`Fetching page ${currentPage} for ${businessCategory}...`);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseData = await response.json();
            apiCallCount++;
            
            if (!responseData.success || !responseData.data) {
                console.log(`Failed to fetch page ${currentPage}`);
                break;
            }
            
            const data = responseData.data;
            const pageSellers = data.data || [];
            
            // Update pagination info on first page
            if (currentPage === 1) {
                totalPages = data.totalPages;
                console.log(`Total pages: ${totalPages}, Total items: ${data.totalItems}`);
                // Initialize progress tracking
                initializeProgress(totalPages, businessCategory);
            }
            
            // Process sellers from this page
            for (const seller of pageSellers) {
                const sellerInfo = {
                    id: seller.id,
                    name_th: seller.nameTh,
                    name_en: seller.nameEn,
                    business_category: businessCategory,
                    address: {
                        no: seller.addressNo,
                        moo: seller.moo,
                        district: seller.district,
                        sub_district: seller.subDistrict,
                        province: seller.province,
                        postal_code: seller.postalCode
                    },
                    location: {
                        longitude: seller.location?.coordinates?.[0] || null,
                        latitude: seller.location?.coordinates?.[1] || null,
                        type: seller.location?.type || null
                    },
                    contact: {
                        mobile: seller.contactMobilePhoneNo,
                        email: seller.contactEmail,
                        additional: seller.contactAdditionalChannel,
                        website: seller.bizContactWebsite,
                        facebook: seller.bizContactFacebook,
                        instagram: seller.bizContactInstagram,
                        line: seller.bizContactLine
                    },
                    rooms: seller.rooms || [],
                    images: seller.images || []
                };
                
                // Calculate contact URLs
                sellerInfo.contact_urls = calculateContactUrls(sellerInfo.contact);
                
                sellers.push(sellerInfo);
            }
            
            console.log(`Page ${currentPage} of ${totalPages}: Found ${pageSellers.length} sellers (Total so far: ${sellers.length})`);
            
            // Update progress
            updateProgress(currentPage, businessCategory);
            
            // Check if there are more pages
            if (!data.hasNextPage || currentPage >= totalPages) {
                break;
            }
            
            // Wait before next request
            await sleep(1000 + Math.random() * 500);
            currentPage++;
        }
        
        console.log(`Total ${businessCategory} sellers found: ${sellers.length}`);
        
        // Update final progress
        updateProgress(totalPages, businessCategory);
        
        return sellers;
        
    } catch (error) {
        console.error(`Error fetching ${businessCategory} data:`, error);
        throw error;
    }
}

// Calculate contact URLs
function calculateContactUrls(contact) {
    const urls = {};
    
    if (contact.website) {
        let websiteUrl = contact.website;
        if (!websiteUrl.startsWith('http') && !websiteUrl.startsWith('https')) {
            websiteUrl = `https://${websiteUrl}`;
        }
        urls.website = websiteUrl;
    }
    
    if (contact.facebook) {
        urls.facebook = contact.facebook;
    }
    
    if (contact.instagram) {
        urls.instagram = contact.instagram;
    }
    
    if (contact.line) {
        urls.line = contact.line;
    }
    
    return urls;
}

// Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate map with Leaflet
function generateMap(sellersData, formData) {
    // Clear existing map
    if (map) {
        map.remove();
        markers = [];
    }
    
    // Calculate center point
    let totalLat = formData.targetLat;
    let totalLon = formData.targetLon;
    let validCoords = 1;
    
    for (const seller of sellersData) {
        if (seller.location.latitude && seller.location.longitude) {
            totalLat += seller.location.latitude;
            totalLon += seller.location.longitude;
            validCoords++;
        }
    }
    
    const centerLat = totalLat / validCoords;
    const centerLon = totalLon / validCoords;
    
    // Create map
    map = L.map('mapContainer').setView([centerLat, centerLon], formData.zoomLevel);
    
    // Add Google Maps tile layer with different style options
    const googleMapsTiles = {
        'roadmap': 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'satellite': 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'hybrid': 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'terrain': 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'
    };
    
    // Use selected map style
    const selectedStyle = formData.mapStyle || 'roadmap';
    const tileLayer = L.tileLayer(googleMapsTiles[selectedStyle], {
        attribution: '© Google Maps',
        maxZoom: 18
    }).addTo(map);
    
    // Store tile layer reference for style switching
    map.tileLayer = tileLayer;
    map.googleMapsTiles = googleMapsTiles;
    
    // Add target location marker
    const targetMarker = L.marker([formData.targetLat, formData.targetLon], {
        icon: L.divIcon({
            className: 'target-marker',
            html: '<div style="background-color: #0066cc; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer;">🎯</div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        }),
        interactive: true,
        clickTolerance: 3
    }).addTo(map);
    
    targetMarker.bindPopup(`
        <div style="width: 300px;">
            <h4 style="margin: 0 0 10px 0; color: #0066cc;">🎯 TARGET LOCATION</h4>
            <p style="margin: 5px 0; font-size: 12px;"><strong>Coordinates:</strong></p>
            <p style="margin: 5px 0; font-size: 12px;">Latitude: ${formData.targetLat}</p>
            <p style="margin: 5px 0; font-size: 12px;">Longitude: ${formData.targetLon}</p>
        </div>
    `, {
        closeButton: true,
        autoClose: false
    });
    
    // Add explicit click handler for target marker
    targetMarker.on('click', function(e) {
        console.log('Target marker clicked');
        if (e.originalEvent) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
        }
        targetMarker.openPopup();
        return false;
    });
    
    // Also handle mousedown to prevent map dragging
    targetMarker.on('mousedown', function(e) {
        if (e.originalEvent) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
        }
        return false;
    });
    
    // Add mouseover for better UX
    targetMarker.on('mouseover', function() {
        targetMarker.getElement().style.transform += ' scale(1.1)';
        // Disable map dragging when hovering over marker
        map.dragging.disable();
    });
    
    targetMarker.on('mouseout', function() {
        targetMarker.getElement().style.transform = targetMarker.getElement().style.transform.replace(' scale(1.1)', '');
        // Re-enable map dragging when leaving marker
        map.dragging.enable();
    });
    
    // Add seller markers
    let accommodationCount = 0;
    let restaurantCount = 0;
    
    for (const seller of sellersData) {
        const lat = seller.location.latitude;
        const lon = seller.location.longitude;
        
        if (lat && lon) {
            const isRestaurant = seller.business_category === 'restaurant';
            
            if (isRestaurant) {
                restaurantCount++;
            } else {
                accommodationCount++;
            }
            
            // Create marker
            const markerColor = isRestaurant ? '#00aa00' : '#cc0000';
            const markerIcon = isRestaurant ? '🍽️' : '🏨';
            
            const marker = L.marker([lat, lon], {
                icon: L.divIcon({
                    className: 'seller-marker',
                    html: `<div style="background-color: ${markerColor}; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer;">${markerIcon}</div>`,
                    iconSize: [25, 25],
                    iconAnchor: [12.5, 12.5]
                }),
                interactive: true,
                clickTolerance: 3
            }).addTo(map);
            
            // Create popup content
            const popupContent = createPopupContent(seller);
            marker.bindPopup(popupContent, { 
                maxWidth: 400,
                closeButton: true,
                autoClose: false
            });
            
            // Add explicit click handler
            marker.on('click', function(e) {
                console.log('Marker clicked:', seller.name_th);
                if (e.originalEvent) {
                    e.originalEvent.stopPropagation();
                    e.originalEvent.preventDefault();
                }
                marker.openPopup();
                return false;
            });
            
            // Also handle mousedown to prevent map dragging
            marker.on('mousedown', function(e) {
                if (e.originalEvent) {
                    e.originalEvent.stopPropagation();
                    e.originalEvent.preventDefault();
                }
                return false;
            });
            
            // Add mouseover for better UX
            marker.on('mouseover', function() {
                marker.getElement().style.transform += ' scale(1.1)';
                // Disable map dragging when hovering over marker
                map.dragging.disable();
            });
            
            marker.on('mouseout', function() {
                marker.getElement().style.transform = marker.getElement().style.transform.replace(' scale(1.1)', '');
                // Re-enable map dragging when leaving marker
                map.dragging.enable();
            });
            
            markers.push(marker);
        }
    }
    
    console.log(`Map generated with ${sellersData.length} sellers (${accommodationCount} accommodations, ${restaurantCount} restaurants)`);
    
    // Show map style switcher and set initial active state
    const mapStyleSwitcher = document.getElementById('mapStyleSwitcher');
    if (mapStyleSwitcher) {
        mapStyleSwitcher.style.display = 'block';
        updateMapStyleButtons(selectedStyle);
    }
}

// Create popup content for seller
function createPopupContent(seller) {
    const isRestaurant = seller.business_category === 'restaurant';
    const titleColor = isRestaurant ? '#00aa00' : '#cc0000';
    const iconSymbol = isRestaurant ? '🍽️' : '🏨';
    
    // Format address safely
    const addressNo = seller.address.no ? String(seller.address.no).replace(/\\/g, '/') : '';
    const addressMoo = seller.address.moo ? String(seller.address.moo) : '';
    
    let popupContent = `
        <div style="width: 350px; max-height: 600px; overflow-y: auto;">
            <h4 style="margin: 0 0 10px 0; color: ${titleColor};">${iconSymbol} ${seller.name_th}</h4>
            <p style="margin: 5px 0; font-size: 12px;"><strong>English:</strong> ${seller.name_en || 'N/A'}</p>
            <p style="margin: 5px 0; font-size: 12px;"><strong>Address:</strong> ${addressNo} หมู่ ${addressMoo}</p>
            <p style="margin: 5px 0; font-size: 12px;"><strong>District:</strong> ${seller.address.district}, ${seller.address.province}</p>
            <p style="margin: 5px 0; font-size: 12px;"><strong>📱 Mobile:</strong> ${seller.contact.mobile || 'N/A'}</p>
    `;
    
    // Add contact links
    if (seller.contact_urls) {
        popupContent += `<div style="margin: 10px 0;"><h6 style="margin: 5px 0; color: #333;">📞 Contact Links:</h6>`;
        
        if (seller.contact_urls.website) {
            popupContent += `<p style="margin: 3px 0; font-size: 11px;"><a href="${seller.contact_urls.website}" target="_blank" style="color: #0066cc; text-decoration: none;">🌐 Website ${seller.contact_urls.website}</a></p>`;
        }
        
        if (seller.contact_urls.facebook) {
            popupContent += `<p style="margin: 3px 0; font-size: 11px;"><a href="${seller.contact_urls.facebook}" target="_blank" style="color: #1877f2; text-decoration: none;">📘 Facebook ${seller.contact_urls.facebook}</a></p>`;
        }
        
        if (seller.contact_urls.instagram) {
            popupContent += `<p style="margin: 3px 0; font-size: 11px;"><a href="${seller.contact_urls.instagram}" target="_blank" style="color: #e4405f; text-decoration: none;">📷 Instagram ${seller.contact_urls.instagram}</a></p>`;
        }
        
        if (seller.contact_urls.line) {
            popupContent += `<p style="margin: 3px 0; font-size: 11px;"><a href="${seller.contact_urls.line}" target="_blank" style="color: #00b900; text-decoration: none;">💬 Line ${seller.contact_urls.line}</a></p>`;
        }
        
        popupContent += `</div>`;
    }
    
    // Add images
    if (seller.images && seller.images.length > 0) {
        popupContent += `<p style="margin: 5px 0; font-size: 12px;"><strong>Images:</strong> ${seller.images.length}</p>`;
        popupContent += `<div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">`;
        
        for (let i = 0; i < Math.min(3, seller.images.length); i++) {
            popupContent += `<img src="${seller.images[i]}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" onerror="this.style.display='none';" alt="Seller image">`;
        }
        
        popupContent += `</div>`;
    }
    
    // Add room details for accommodations
    if (!isRestaurant && seller.rooms && seller.rooms.length > 0) {
        popupContent += `<h6 style="margin: 10px 0 5px 0; color: #333;">🏠 Rooms:</h6>`;
        
        for (const room of seller.rooms) {
            let roomImagesHtml = '';
            if (room.images && room.images.length > 0) {
                roomImagesHtml = `<div style="display: flex; flex-wrap: wrap; gap: 3px; margin-top: 5px;">`;
                for (let i = 0; i < Math.min(2, room.images.length); i++) {
                    roomImagesHtml += `<img src="${room.images[i]}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 3px; border: 1px solid #ccc;" onerror="this.style.display='none';" alt="Room image">`;
                }
                roomImagesHtml += `</div>`;
            }
            
            popupContent += `
                <div style="border: 1px solid #ddd; width: 250px; margin: 8px 0; padding: 10px; border-radius: 6px; background: #f9f9f9;">
                    <p style="margin: 2px 0; font-size: 11px;"><strong>🏠 ${room.name || 'N/A'}</strong></p>
                    <p style="margin: 2px 0; font-size: 11px;">💰 Price: ${room.price || 'N/A'} บาท</p>
                    <p style="margin: 2px 0; font-size: 11px;">🛏️ Rooms: ${room.numberOfRoom || 'N/A'}</p>
                    ${roomImagesHtml}
                </div>
            `;
        }
    }
    
    popupContent += `</div>`;
    return popupContent;
}

// Update statistics
function updateStats(sellersData) {
    const accommodationCount = sellersData.filter(s => s.business_category === 'accommodation').length;
    const restaurantCount = sellersData.filter(s => s.business_category === 'restaurant').length;
    const cacheStats = getCacheStats();
    
    document.getElementById('totalSellers').textContent = sellersData.length;
    document.getElementById('accommodationCount').textContent = accommodationCount;
    document.getElementById('restaurantCount').textContent = restaurantCount;
    document.getElementById('apiCalls').textContent = apiCallCount;
    
    // Update cache stats in console and UI
    const hitRate = cacheStats.hits + cacheStats.misses > 0 ? Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100) : 0;
    console.log('Cache performance:', {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: hitRate
    });
    
    // Update cache status in UI
    const cacheStatusElement = document.getElementById('cacheStatus');
    if (cacheStatusElement) {
        if (cacheStats.hits + cacheStats.misses === 0) {
            cacheStatusElement.textContent = 'No Data';
        } else {
            cacheStatusElement.textContent = `${hitRate}% Hit`;
        }
    }
}

// Show loading
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    // Reset progress
    resetProgress();
}

// Hide loading
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    // Hide progress section
    document.getElementById('progressSection').style.display = 'none';
}

// Initialize progress tracking
function initializeProgress(totalPages, category) {
    totalExpectedPages = totalPages;
    currentPage = 0;
    
    const progressSection = document.getElementById('progressSection');
    const progressText = document.getElementById('progressText');
    
    progressSection.style.display = 'block';
    progressText.textContent = `Fetching ${category} data... (0/${totalPages} pages)`;
    updateProgressBar(0);
}

// Update progress
function updateProgress(page, category) {
    currentPage = page;
    const percentage = Math.round((page / totalExpectedPages) * 100);
    
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    progressBar.style.width = percentage + '%';
    progressText.textContent = `Fetching ${category} data... (${page}/${totalExpectedPages} pages)`;
}

// Reset progress
function resetProgress() {
    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    progressSection.style.display = 'none';
    progressBar.style.width = '0%';
    progressText.textContent = 'Initializing...';
    
    totalExpectedPages = 0;
    currentPage = 0;
}

// Update progress bar
function updateProgressBar(percentage) {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = percentage + '%';
}

// Cache management functions
function generateCacheKey(apiUrl, provinces, businessTypes, businessCategory) {
    const keyData = {
        apiUrl: apiUrl,
        provinces: provinces.sort(),
        businessTypes: businessTypes.sort(),
        businessCategory: businessCategory
    };
    
    // Use encodeURIComponent to handle Unicode characters safely
    const jsonString = JSON.stringify(keyData);
    const encoded = encodeURIComponent(jsonString);
    
    // Create a hash-like string that's safe for localStorage keys
    let hash = 0;
    for (let i = 0; i < encoded.length; i++) {
        const char = encoded.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return 'map_cache_' + Math.abs(hash).toString(36);
}

function getCachedData(cacheKey) {
    try {
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        
        // Check if cache is still valid (24 hours)
        const now = Date.now();
        if (now - data.timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(cacheKey);
            return null;
        }
        
        console.log('Cache hit for key:', cacheKey);
        cacheHits++;
        return data.data;
    } catch (error) {
        console.error('Error reading cache:', error);
        return null;
    }
}

function setCachedData(cacheKey, data) {
    try {
        const cacheData = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('Cached data for key:', cacheKey);
    } catch (error) {
        console.error('Error writing cache:', error);
        // If localStorage is full, clear old entries
        clearOldCache();
    }
}

function clearOldCache() {
    try {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter(key => key.startsWith('map_cache_'));
        
        // Sort by timestamp and remove oldest entries
        const cacheEntries = cacheKeys.map(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                return { key, timestamp: data.timestamp };
            } catch {
                return { key, timestamp: 0 };
            }
        }).sort((a, b) => a.timestamp - b.timestamp);
        
        // Remove oldest 50% of entries if we have more than 20
        if (cacheEntries.length > 20) {
            const toRemove = cacheEntries.slice(0, Math.floor(cacheEntries.length / 2));
            toRemove.forEach(entry => localStorage.removeItem(entry.key));
            console.log('Cleared old cache entries:', toRemove.length);
        }
    } catch (error) {
        console.error('Error clearing old cache:', error);
    }
}

function getCacheStats() {
    try {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter(key => key.startsWith('map_cache_'));
        return {
            totalEntries: cacheKeys.length,
            totalSize: cacheKeys.reduce((size, key) => size + localStorage.getItem(key).length, 0),
            hits: cacheHits,
            misses: cacheMisses
        };
    } catch (error) {
        console.error('Error getting cache stats:', error);
        return { totalEntries: 0, totalSize: 0, hits: 0, misses: 0 };
    }
}

// Debounce function to limit how often a function can be called
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Real-time token validation on input
function validateTokenOnInput() {
    const apiTokenInput = document.getElementById('apiToken');
    const token = apiTokenInput.value.trim();
    
    if (!token) {
        // Clear any previous validation feedback
        apiTokenInput.classList.remove('is-valid', 'is-invalid');
        return;
    }
    
    try {
        validateApiToken('', token); // We don't need the URL for client-side validation
        apiTokenInput.classList.remove('is-invalid');
        apiTokenInput.classList.add('is-valid');
    } catch (error) {
        apiTokenInput.classList.remove('is-valid');
        apiTokenInput.classList.add('is-invalid');
    }
}

// Show results
function showResults() {
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

// Hide results
function hideResults() {
    document.getElementById('resultsSection').style.display = 'none';
}



// Clear all provinces from the textarea
function clearAllProvinces() {
    const searchProvincesTextarea = document.getElementById('searchProvinces');
    
    if (!searchProvincesTextarea) {
        return;
    }
    
    if (!searchProvincesTextarea.value.trim()) {
        showError('No provinces to clear');
        return;
    }
    
    // Confirm clearing
    if (!confirm('Are you sure you want to clear all provinces?')) {
        return;
    }
    
    // Clear textarea
    searchProvincesTextarea.value = '';
    
    // Show success message
    showSuccess('All provinces cleared successfully!');
}

// Add common Thai provinces to the textarea
function addCommonProvinces() {
    const searchProvincesTextarea = document.getElementById('searchProvinces');
    
    if (!searchProvincesTextarea) {
        return;
    }
    
    const commonProvinces = [
        'กระบี่',
        'กาญจนบุรี',
        'กาฬสินธุ์',
        'กำแพงเพชร',
        'ขอนแก่น',
        'จันทบุรี',
        'ฉะเชิงเทรา',
        'ชลบุรี',
        'ชัยนาท',
        'ชัยภูมิ',
        'ชุมพร',
        'เชียงราย',
        'เชียงใหม่',
        'ตรัง',
        'ตราด',
        'ตาก',
        'นครนายก',
        'นครปฐม',
        'นครพนม',
        'นครราชสีมา',
        'นครศรีธรรมราช',
        'นครสวรรค์',
        'นนทบุรี',
        'นราธิวาส',
        'น่าน',
        'บึงกาฬ',
        'บุรีรัมย์',
        'ปทุมธานี',
        'ประจวบคีรีขันธ์',
        'ปราจีนบุรี',
        'ปัตตานี',
        'พะเยา',
        'พังงา',
        'พัทลุง',
        'พิจิตร',
        'พิษณุโลก',
        'เพชรบุรี',
        'เพชรบูรณ์',
        'แพร่',
        'ภูเก็ต',
        'มหาสารคาม',
        'มุกดาหาร',
        'แม่ฮ่องสอน',
        'ยะลา',
        'ยโสธร',
        'ร้อยเอ็ด',
        'ระนอง',
        'ระยอง',
        'ราชบุรี',
        'ลพบุรี',
        'ลำปาง',
        'ลำพูน',
        'เลย',
        'ศรีสะเกษ',
        'สกลนคร',
        'สงขลา',
        'สตูล',
        'สมุทรปราการ',
        'สมุทรสงคราม',
        'สมุทรสาคร',
        'สระแก้ว',
        'สระบุรี',
        'สิงห์บุรี',
        'สุโขทัย',
        'สุพรรณบุรี',
        'สุราษฎร์ธานี',
        'สุรินทร์',
        'หนองคาย',
        'หนองบัวลำภู',
        'อ่างทอง',
        'อุดรธานี',
        'อุทัยธานี',
        'อุตรดิตถ์',
        'อุบลราชธานี',
        'อำนาจเจริญ',
        'กรุงเทพมหานคร'
    ];
    
    // Get existing provinces
    const existingProvinces = searchProvincesTextarea.value.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    let addedCount = 0;
    
    commonProvinces.forEach(province => {
        // Check if province already exists
        const provinceExists = existingProvinces.some(existing => 
            existing.toLowerCase() === province.toLowerCase()
        );
        
        if (!provinceExists) {
            // Add to textarea
            const currentValue = searchProvincesTextarea.value.trim();
            const newValue = currentValue ? currentValue + '\n' + province : province;
            searchProvincesTextarea.value = newValue;
            addedCount++;
        }
    });
    
    if (addedCount > 0) {
        showSuccess(`Added ${addedCount} common provinces successfully!`);
    } else {
        showError('All common provinces are already in the list');
    }
}

// Format provinces list (remove duplicates, sort, clean up)
function formatProvinces() {
    const searchProvincesTextarea = document.getElementById('searchProvinces');
    
    if (!searchProvincesTextarea) {
        return;
    }
    
    if (!searchProvincesTextarea.value.trim()) {
        showError('No provinces to format');
        return;
    }
    
    // Get provinces and clean them up
    const provinces = searchProvincesTextarea.value.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    if (provinces.length === 0) {
        showError('No valid provinces found');
        return;
    }
    
    // Remove duplicates (case-insensitive)
    const uniqueProvinces = [];
    const seen = new Set();
    
    provinces.forEach(province => {
        const lowerProvince = province.toLowerCase();
        if (!seen.has(lowerProvince)) {
            seen.add(lowerProvince);
            uniqueProvinces.push(province);
        }
    });
    
    // Sort provinces alphabetically
    uniqueProvinces.sort();
    
    // Update textarea
    searchProvincesTextarea.value = uniqueProvinces.join('\n');
    
    const removedCount = provinces.length - uniqueProvinces.length;
    if (removedCount > 0) {
        showSuccess(`Formatted list: Removed ${removedCount} duplicate(s), sorted alphabetically`);
    } else {
        showSuccess('Formatted list: Sorted alphabetically');
    }
}



// Show success message
function showSuccess(message) {
    // Create success alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${message}
    `;
    
    // Insert after form
    const form = document.getElementById('mapForm');
    form.parentNode.insertBefore(alertDiv, form.nextSibling);
    
    // Remove alert after 3 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Show error
function showError(message) {
    hideLoading();
    
    // Create error alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        ${message}
    `;
    
    // Insert after form
    const form = document.getElementById('mapForm');
    form.parentNode.insertBefore(alertDiv, form.nextSibling);
    
    // Remove alert after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Cache management functions
function showCacheStats() {
    const stats = getCacheStats();
    const totalSizeKB = Math.round(stats.totalSize / 1024);
    const hitRate = stats.hits + stats.misses > 0 ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100) : 0;
    
    const message = `
        <strong>Cache Statistics:</strong><br>
        • Total entries: ${stats.totalEntries}<br>
        • Total size: ${totalSizeKB} KB<br>
        • Cache hits: ${stats.hits}<br>
        • Cache misses: ${stats.misses}<br>
        • Hit rate: ${hitRate}%
    `;
    
    showSuccess(message);
}

function clearAllCache() {
    try {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter(key => key.startsWith('map_cache_'));
        
        cacheKeys.forEach(key => localStorage.removeItem(key));
        
        // Reset cache counters
        cacheHits = 0;
        cacheMisses = 0;
        
        showSuccess(`Cleared ${cacheKeys.length} cache entries successfully.`);
        console.log('All cache cleared');
    } catch (error) {
        console.error('Error clearing cache:', error);
        showError('Failed to clear cache. Please try again.');
    }
}

// Clear user preferences
function clearUserPreferences() {
    try {
        localStorage.removeItem(USER_PREFERENCES_KEY);
        
        // Reset form to default values
        document.getElementById('apiUrl').value = 'http://backend-api.tat.or.th/mobile/buyer/booking/sellers';
        document.getElementById('apiToken').value = '';
        document.getElementById('targetLat').value = '14.4428927';
        document.getElementById('targetLon').value = '101.3728028';
        document.getElementById('mapStyle').value = 'roadmap';
        document.getElementById('searchProvinces').value = 'กรุงเทพมหานคร\nเชียงใหม่\nภูเก็ต';
        
        // Reset checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            if (['hotel', 'homestay', 'resort', 'daily'].includes(checkbox.id)) {
                checkbox.checked = true;
            } else {
                checkbox.checked = false;
            }
        });
        
        showSuccess('User preferences cleared successfully.');
        console.log('User preferences cleared');
    } catch (error) {
        console.error('Error clearing preferences:', error);
        showError('Failed to clear preferences. Please try again.');
    }
}

// Switch map style without reloading data
function switchMapStyle(style) {
    if (!map || !map.tileLayer || !map.googleMapsTiles) {
        console.error('Map not initialized');
        return;
    }
    
    try {
        // Remove current tile layer
        map.removeLayer(map.tileLayer);
        
        // Add new tile layer with selected style
        map.tileLayer = L.tileLayer(map.googleMapsTiles[style], {
            attribution: '© Google Maps',
            maxZoom: 18
        }).addTo(map);
        
        // Update active button state
        updateMapStyleButtons(style);
        
        console.log(`Map style switched to: ${style}`);
    } catch (error) {
        console.error('Error switching map style:', error);
        showError('Failed to switch map style. Please try again.');
    }
}

// Update map style button states
function updateMapStyleButtons(activeStyle) {
    const buttons = document.querySelectorAll('#mapStyleSwitcher button');
    buttons.forEach(button => {
        const style = button.getAttribute('data-style');
        if (style === activeStyle) {
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-primary');
        } else {
            button.classList.remove('btn-primary');
            button.classList.add('btn-outline-primary');
        }
    });
} 