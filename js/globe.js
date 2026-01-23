// Globe Visualization using three-globe
export class GlobeViz {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.globe = null;
        this.countryClickCallback = null;

        this.init();
    }

    init() {
        // Create globe with wireframe style
        this.globe = new ThreeGlobe()
            .showGlobe(true)
            .globeMaterial(new THREE.MeshBasicMaterial({
                color: 0x0a0e27,
                transparent: true,
                opacity: 0.9
            }))
            .showAtmosphere(true)
            .atmosphereColor('lightskyblue')
            .atmosphereAltitude(0.15);

        // Setup renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(renderer.domElement);

        // Setup scene
        const scene = new THREE.Scene();
        scene.add(this.globe);
        scene.add(new THREE.AmbientLight(0xbbbbbb, 0.3));
        scene.add(new THREE.DirectionalLight(0xffffff, 0.8));

        // Setup camera
        const camera = new THREE.PerspectiveCamera();
        camera.aspect = this.container.clientWidth / this.container.clientHeight;
        camera.updateProjectionMatrix();
        camera.position.z = 500;

        // Handle window resize with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const width = this.container.clientWidth;
                const height = this.container.clientHeight;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            }, 100);
        });

        // Mouse controls - improved handling
        this.isDragging = false;
        let dragStarted = false;
        let previousMousePosition = { x: 0, y: 0 };

        const handleMouseDown = (e) => {
            dragStarted = true;
            this.isDragging = false;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        };

        const handleMouseMove = (e) => {
            if (!dragStarted) return;

            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > 3) {
                this.isDragging = true;
                this.globe.rotation.y += deltaX * 0.005;
                this.globe.rotation.x += deltaY * 0.005;
                // Clamp x rotation to prevent flipping
                this.globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.globe.rotation.x));
            }

            previousMousePosition = { x: e.clientX, y: e.clientY };
        };

        const handleMouseUp = () => {
            dragStarted = false;
            setTimeout(() => { this.isDragging = false; }, 10);
        };

        renderer.domElement.addEventListener('mousedown', handleMouseDown);
        renderer.domElement.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        // Zoom with mouse wheel
        renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            camera.position.z += e.deltaY * 0.3;
            camera.position.z = Math.max(250, Math.min(800, camera.position.z));
        });

        // Store references
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.selectedCountry = null;

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);

            // No auto-rotation - removed the rotation code

            renderer.render(scene, camera);
        };

        animate();

        // Load country data for clickable polygons
        this.loadCountryData();
    }

    async loadCountryData() {
        try {
            // Load GeoJSON data for countries
            const response = await fetch('https://unpkg.com/world-atlas@2/countries-110m.json');
            const data = await response.json();

            // Convert TopoJSON to GeoJSON
            const countries = topojson.feature(data, data.objects.countries);

            // Add country polygons to globe
            this.globe.polygonsData(countries.features);
            this.globe.polygonCapColor(() => 'rgba(0, 100, 200, 0.15)');
            this.globe.polygonSideColor(() => 'rgba(0, 100, 200, 0.05)');
            this.globe.polygonStrokeColor(() => '#4fc3f7');
            this.globe.polygonAltitude(0.01);

            // Set up click handler using raycaster
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            this.renderer.domElement.addEventListener('click', (e) => {
                if (this.isDragging) return;

                mouse.x = (e.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
                mouse.y = -(e.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

                raycaster.setFromCamera(mouse, this.camera);
                const intersects = raycaster.intersectObjects(this.globe.children, true);

                if (intersects.length > 0) {
                    // Get the intersection point in globe's local coordinates
                    const point = intersects[0].point.clone();

                    // Transform from world coordinates to globe's local coordinates
                    const inverseMatrix = new THREE.Matrix4();
                    inverseMatrix.copy(this.globe.matrixWorld).invert();
                    point.applyMatrix4(inverseMatrix);
                    point.normalize();

                    // Convert to spherical coordinates (lat/lng)
                    const lat = Math.asin(point.y) * 180 / Math.PI;
                    const lng = Math.atan2(point.x, point.z) * 180 / Math.PI;

                    console.log('Clicked at lat:', lat.toFixed(2), 'lng:', lng.toFixed(2));

                    // Find which country contains this point
                    const clickedCountry = this.findCountryAtPoint(lat, lng);

                    if (clickedCountry && this.countryClickCallback) {
                        const countryCode = this.mapCountryNameToCode(clickedCountry.properties.name);
                        console.log('Detected country:', clickedCountry.properties.name, '->', countryCode);
                        this.highlightCountry(clickedCountry);
                        this.countryClickCallback(countryCode);
                    }
                }
            });

            this.countriesData = countries.features;
            console.log('Country data loaded:', countries.features.length, 'countries');
        } catch (error) {
            console.error('Failed to load country data:', error);
        }
    }

    highlightCountry(country) {
        // Update polygon colors to highlight the selected country
        const selectedCountryCode = this.mapCountryNameToCode(country.properties.name);
        this.selectedCountry = selectedCountryCode;

        // Reapply heatmap colors but with highlight for selected country
        this.globe.polygonCapColor(feature => {
            const countryName = feature.properties.name;
            const countryCode = this.mapCountryNameToCode(countryName);
            const value = this.currentValueMap ? this.currentValueMap[countryCode] : undefined;

            if (countryCode === selectedCountryCode) {
                // Highlight selected country with yellow border/glow
                return value !== undefined ? this.currentColorMap[countryCode] : 'rgba(255, 200, 0, 0.9)';
            }

            if (value !== undefined && this.currentColorMap) {
                return this.currentColorMap[countryCode];
            }

            // Default color for countries with no data
            return 'rgba(50, 50, 50, 0.3)';
        });

        // Add stroke highlight for selected country
        this.globe.polygonStrokeColor(d => {
            const countryCode = this.mapCountryNameToCode(d.properties.name);
            return countryCode === selectedCountryCode ? '#FFD700' : '#4fc3f7';
        });
    }

    findCountryAtPoint(lat, lng) {
        // Check each country polygon to see if it contains the point
        for (const feature of this.countriesData) {
            if (this.pointInPolygon(lat, lng, feature)) {
                return feature;
            }
        }
        return null;
    }

    pointInPolygon(lat, lng, feature) {
        // Simple point-in-polygon test
        // This handles both Polygon and MultiPolygon geometries
        const geometry = feature.geometry;

        if (geometry.type === 'Polygon') {
            return this.pointInPolygonRing(lat, lng, geometry.coordinates[0]);
        } else if (geometry.type === 'MultiPolygon') {
            for (const polygon of geometry.coordinates) {
                if (this.pointInPolygonRing(lat, lng, polygon[0])) {
                    return true;
                }
            }
        }
        return false;
    }

    pointInPolygonRing(lat, lng, ring) {
        // Ray casting algorithm
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0], yi = ring[i][1];
            const xj = ring[j][0], yj = ring[j][1];

            const intersect = ((yi > lat) !== (yj > lat)) &&
                (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    mapCountryNameToCode(name) {
        // Mapping from GeoJSON country names to our database country codes
        const mapping = {
            'United States of America': 'united-states',
            'United States': 'united-states',
            'United Kingdom': 'united-kingdom',
            'South Africa': 'south-africa',
            'New Zealand': 'new-zealand',
            'Saudi Arabia': 'saudi-arabia',
            'South Korea': 'korea',
            'Korea': 'korea',
            'North Korea': 'korea',
            'Czech Republic': 'czechia',
            'Czechia': 'czechia',
            'Netherlands': 'the-netherlands',
            'The Netherlands': 'the-netherlands',
            'Bosnia and Herzegovina': 'bosnia-and-herzegovina',
            'United Arab Emirates': 'united-arab-emirates',
            'Republic of the Congo': 'congo',
            'Congo': 'congo',
            'Democratic Republic of the Congo': 'democratic-republic-of-the-congo',
            'Ivory Coast': 'cote-divoire',
            "Côte d'Ivoire": 'cote-divoire',
            'East Timor': 'timor-leste',
            'Timor-Leste': 'timor-leste',
            'Swaziland': 'eswatini',
            'Eswatini': 'eswatini',
            'Macedonia': 'north-macedonia',
            'North Macedonia': 'north-macedonia',
            'Myanmar': 'myanmar',
            'Burma': 'myanmar',
            'Palestine': 'palestine',
            'Slovak Republic': 'slovak-republic',
            'Slovakia': 'slovak-republic',
            'Taiwan': 'chinese-taipei',
            'Chinese Taipei': 'chinese-taipei',
            'Turkey': 'turkiye',
            'Türkiye': 'turkiye',
            'Cape Verde': 'cabo-verde',
            'Cabo Verde': 'cabo-verde',
            'South Sudan': 'south-sudan',
            'Trinidad and Tobago': 'trinidad-and-tobago',
            'São Tomé and Príncipe': 'sao-tome-and-principe',
            'Brunei': 'brunei-darussalam',
            'Brunei Darussalam': 'brunei-darussalam'
        };

        // Check direct mapping first
        if (mapping[name]) {
            return mapping[name];
        }

        // Otherwise, convert to lowercase and replace spaces with hyphens
        return name.toLowerCase().replace(/ /g, '-');
    }

    updateHeatmap(data) {
        console.log('Heatmap data updated:', data.length, 'countries');

        // Create a map of country code to value for quick lookup
        const valueMap = {};
        const colorMap = {};
        let maxValue = 0;
        let minValue = Infinity;

        data.forEach(d => {
            valueMap[d.country] = d.value;
            maxValue = Math.max(maxValue, d.value);
            minValue = Math.min(minValue, d.value);
        });

        console.log('Value range:', minValue, 'to', maxValue);

        // Pre-calculate colors for all countries
        data.forEach(d => {
            const normalized = (d.value - minValue) / (maxValue - minValue || 1);
            const r = Math.round(normalized * 255);
            const g = Math.round((1 - normalized) * 100);
            const b = Math.round((1 - normalized) * 255);
            colorMap[d.country] = `rgba(${r}, ${g}, ${b}, 0.8)`;
        });

        // Store for use in highlightCountry
        this.currentValueMap = valueMap;
        this.currentColorMap = colorMap;

        // Update polygon colors based on data
        this.globe.polygonCapColor(feature => {
            const countryName = feature.properties.name;
            const countryCode = this.mapCountryNameToCode(countryName);
            const value = valueMap[countryCode];

            if (value !== undefined) {
                return colorMap[countryCode];
            }

            // Default color for countries with no data
            return 'rgba(50, 50, 50, 0.3)';
        });

        this.globe.polygonSideColor(() => 'rgba(0, 0, 0, 0.1)');
        this.globe.polygonStrokeColor(() => '#4fc3f7');
        this.globe.polygonAltitude(d => {
            const countryName = d.properties.name;
            const countryCode = this.mapCountryNameToCode(countryName);
            const value = valueMap[countryCode];
            return value !== undefined ? 0.01 : 0.005;
        });
    }

    onCountryClick(callback) {
        this.countryClickCallback = callback;
    }
}
