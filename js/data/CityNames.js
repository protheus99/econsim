// js/data/CityNames.js
export const CITY_NAMES = [
    // Valdoria Cities (Northern - Industrial)
    'Northhaven', 'Steelport', 'Irondale', 'Coalbrook', 'Milltown',
    'Forgeshire', 'Hammerfall', 'Anvilcrest', 'Metaltown', 'Smelterton',
    
    // Thalassia Cities (Southern - Maritime)
    'Portmaris', 'Deepwater', 'Coralhaven', 'Tidegate', 'Wavecrest',
    'Sailors Rest', 'Anchor Bay', 'Lighthouse Point', 'Marina Vista', 'Dockside',
    
    // Meridian Cities (Eastern - Agricultural)
    'Cottonfield', 'Ricevale', 'Rubbertown', 'Silkroad', 'Harvestdale',
    'Cropshire', 'Grainfield', 'Farmstead', 'Pastoral', 'Meadowlands',
    
    // Aetheria Cities (Western - Technology)
    'Goldpeak', 'Techville', 'Innovate City', 'Uranburg', 'Wheatlands',
    'Silicon Springs', 'Digital Harbor', 'Tech Valley', 'Innovation Point', 'Cyber City',
    
    // Novaterra Cities (Central - Tropical Agriculture)
    'Coffeeport', 'Cocoaville', 'Sugarcane Falls', 'Plantation City', 'Tropicana',
    'Palm Grove', 'Banana Bay', 'Spice Harbor', 'Vanilla Heights', 'Coconut Coast',
    
    // Crystalia Cities (Northern - Mining/Luxury)
    'Diamondcrest', 'Platinum Heights', 'Nickelton', 'Gemstone Bay', 'Crystal Falls',
    'Jewelport', 'Sapphire City', 'Emerald Valley', 'Ruby Ridge', 'Pearl Harbor',
    
    // Verdania Cities (Southern - Forestry/Agriculture)
    'Timberline', 'Cattletown', 'Cornhaven', 'Forestdale', 'Ranchlands',
    'Oakwood', 'Pinehurst', 'Maplewood', 'Cedarville', 'Birchgrove',
    
    // Solvaris Cities (Eastern - Renewable Energy)
    'Sunreach', 'Lithium Springs', 'Rare Earth Valley', 'Solartown', 'Brightcity',
    'Photon Bay', 'Voltage Point', 'Powerfield', 'Energy Harbor', 'Windmill Heights',
    
    // Aquilonia Cities (Western - Oil/Gas)
    'Oilfield', 'Gasport', 'Aluminatown', 'Petrograd', 'Refineryville',
    'Drilltown', 'Pipeline City', 'Crude Bay', 'Petroleum Point', 'Tanker Port',
    
    // Terranova Cities (Central - Mining)
    'Silvermine', 'Leadville', 'Zincton', 'Newmines', 'Prospector City',
    'Excavation Point', 'Quarryville', 'Oretown', 'Mineral Springs', 'Veinburg',
    
    // General City Names
    'Riverside', 'Lakeside', 'Mountainview', 'Valleytown', 'Hillcrest',
    'Meadowbrook', 'Springdale', 'Winterhaven', 'Summerton', 'Autumndale',
    'Frostburg', 'Sunrise', 'Sunset City', 'Midtown', 'Centerport',
    'Edgeville', 'Cornerstone', 'Crossroads', 'Junction City', 'Gateway',
    'Bridgetown', 'Fairview', 'Clearwater', 'Brightwater', 'Stillwater',
    
    // Industrial Cities
    'Factorytown', 'Millsburg', 'Forgeville', 'Foundryport', 'Workshopdale',
    'Assembly City', 'Production Park', 'Manufacturing Heights', 'Industrial Point',
    'Machinist Bay', 'Toolmakers Haven', 'Gearsburg', 'Pistonville', 'Boltcity',
    'Rivettown', 'Weldport', 'Casting Heights', 'Molding Bay', 'Pressing Point',
    
    // Agricultural Extensions
    'Farmdale', 'Croptown', 'Orchard Heights', 'Vineyard Hills', 'Pasture Point',
    'Barley Fields', 'Wheatport', 'Ricetown', 'Cornfield City', 'Soybean Valley',
    'Dairy Plains', 'Poultry Point', 'Livestock Landing', 'Shepherd Hills', 'Rancher Bay',
    
    // Tech Cities
    'Dataport', 'Codetown', 'Byteburg', 'Algorithm City', 'Digital Heights',
    'Cyber Bay', 'Network Point', 'Cloudville', 'Serverburg', 'Bandwidth City',
    'Fiber Point', 'Wireless Heights', 'Satellite Bay', 'Router Ridge', 'Protocol Port',
    
    // Financial Centers
    'Banktown', 'Finance Point', 'Capital City', 'Investment Heights', 'Tradeburg',
    'Commerce Bay', 'Exchange Port', 'Treasury Point', 'Vault City', 'Crediton',
    'Equity Falls', 'Bond Street', 'Stock Plaza', 'Asset Park', 'Dividend Heights',
    
    // Port Cities
    'Harborview', 'Docklands', 'Shipyard Point', 'Anchorage Bay', 'Marina City',
    'Piertown', 'Wharfside', 'Portside', 'Berth Haven', 'Mooringville',
    'Container Port', 'Cargo Bay', 'Loading Dock', 'Export Point', 'Import City',
    
    // Mining Towns
    'Mineshaft', 'Quarryville', 'Excavation Point', 'Diggers Dale', 'Pittown',
    'Borehole City', 'Drillers Haven', 'Tunnelburg', 'Shaftville', 'Sluice Point',
    'Goldrush', 'Coppertown', 'Ironworks', 'Coalface', 'Ore Heights'
];

// City name generator with country assignment
export class CityNameGenerator {
    constructor(countries) {
        this.availableNames = [...CITY_NAMES];
        this.usedNames = new Set();
        this.countries = countries;
    }
    
    getRandomName() {
        if (this.availableNames.length === 0) {
            // If we run out, generate procedural names
            return this.generateProceduralName();
        }
        
        const index = Math.floor(Math.random() * this.availableNames.length);
        const name = this.availableNames[index];
        
        this.availableNames.splice(index, 1);
        this.usedNames.add(name);
        
        return name;
    }
    
    generateProceduralName() {
        const prefixes = ['New', 'Old', 'North', 'South', 'East', 'West', 'Upper', 'Lower'];
        const suffixes = ['ville', 'town', 'city', 'port', 'field', 'dale', 'haven', 'burg'];
        const middles = ['Oak', 'Pine', 'River', 'Lake', 'Hill', 'Valley', 'Stone', 'Wood'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const middle = middles[Math.floor(Math.random() * middles.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        
        return `${prefix}${middle}${suffix}`;
    }
    
    getNameForCountry(country) {
        // Get a name and associate it with the country
        return this.getRandomName();
    }
    
    reset() {
        this.availableNames = [...CITY_NAMES];
        this.usedNames.clear();
    }
}
