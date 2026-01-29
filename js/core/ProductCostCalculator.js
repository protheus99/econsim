// js/core/ProductCostCalculator.js
// Calculates the true cost of manufactured goods based on input materials

export class ProductCostCalculator {
    constructor(productRegistry) {
        this.registry = productRegistry;
        this.productsByName = new Map();

        // Build name-based lookup for easier input resolution
        this.registry.getAllProducts().forEach(product => {
            this.productsByName.set(product.name, product);
        });
    }

    /**
     * Calculate the full cost breakdown for a product
     * @param {Product|string|number} product - Product instance, name, or ID
     * @param {Object} options - Calculation options
     * @param {number} options.laborCostPerHour - Labor cost per production hour (default: 50)
     * @param {number} options.overheadMultiplier - Overhead as multiplier of material cost (default: 0.15)
     * @param {boolean} options.useCurrentPrices - Use currentPrice instead of basePrice (default: false)
     * @returns {ProductCostBreakdown}
     */
    calculateCost(product, options = {}) {
        const resolvedProduct = this.resolveProduct(product);
        if (!resolvedProduct) {
            return null;
        }

        const {
            laborCostPerHour = 50,
            overheadMultiplier = 0.15,
            useCurrentPrices = false
        } = options;

        const breakdown = new ProductCostBreakdown(resolvedProduct);

        // RAW materials have no input costs - their cost is their base price
        if (resolvedProduct.tier === 'RAW' || !resolvedProduct.inputs || resolvedProduct.inputs.length === 0) {
            breakdown.rawMaterialCost = useCurrentPrices ? resolvedProduct.currentPrice : resolvedProduct.basePrice;
            breakdown.totalMaterialCost = breakdown.rawMaterialCost;
            breakdown.laborCost = 0;
            breakdown.overheadCost = 0;
            breakdown.totalCost = breakdown.rawMaterialCost;
            breakdown.isRawMaterial = true;
            return breakdown;
        }

        // Calculate material costs from inputs
        let totalMaterialCost = 0;

        resolvedProduct.inputs.forEach(input => {
            const inputProduct = this.productsByName.get(input.material);
            if (!inputProduct) {
                console.warn(`Input material not found: ${input.material}`);
                return;
            }

            // Recursively calculate input cost
            const inputBreakdown = this.calculateCost(inputProduct, options);
            const inputUnitCost = inputBreakdown ? inputBreakdown.totalCost :
                (useCurrentPrices ? inputProduct.currentPrice : inputProduct.basePrice);

            const inputTotalCost = inputUnitCost * input.quantity;
            totalMaterialCost += inputTotalCost;

            breakdown.inputs.push({
                material: input.material,
                quantity: input.quantity,
                unitCost: inputUnitCost,
                totalCost: inputTotalCost,
                tier: inputProduct.tier,
                breakdown: inputBreakdown
            });
        });

        // Calculate labor cost based on production time
        const laborCost = (resolvedProduct.productionTime || 1) * laborCostPerHour;

        // Calculate overhead as percentage of material cost
        const overheadCost = totalMaterialCost * overheadMultiplier;

        breakdown.totalMaterialCost = totalMaterialCost;
        breakdown.laborCost = laborCost;
        breakdown.overheadCost = overheadCost;
        breakdown.totalCost = totalMaterialCost + laborCost + overheadCost;

        return breakdown;
    }

    /**
     * Calculate costs for all products and return analysis
     * @param {Object} options - Calculation options
     * @returns {Array<ProductCostAnalysis>}
     */
    analyzeAllProducts(options = {}) {
        const analysis = [];

        this.registry.getAllProducts().forEach(product => {
            const breakdown = this.calculateCost(product, options);
            if (breakdown) {
                analysis.push({
                    product: product,
                    breakdown: breakdown,
                    basePrice: product.basePrice,
                    calculatedCost: breakdown.totalCost,
                    margin: product.basePrice - breakdown.totalCost,
                    marginPercent: ((product.basePrice - breakdown.totalCost) / breakdown.totalCost) * 100,
                    isUnderpriced: breakdown.totalCost > product.basePrice,
                    isOverpriced: breakdown.totalCost < product.basePrice * 0.5
                });
            }
        });

        // Sort by margin percent (most underpriced first)
        analysis.sort((a, b) => a.marginPercent - b.marginPercent);

        return analysis;
    }

    /**
     * Get suggested prices for all products based on calculated costs
     * @param {Object} options - Calculation options
     * @param {number} options.targetMargin - Target profit margin (default: 0.25 = 25%)
     * @returns {Map<number, SuggestedPrice>}
     */
    getSuggestedPrices(options = {}) {
        const { targetMargin = 0.25, ...calcOptions } = options;
        const suggestions = new Map();

        this.registry.getAllProducts().forEach(product => {
            const breakdown = this.calculateCost(product, calcOptions);
            if (breakdown) {
                const suggestedPrice = breakdown.totalCost * (1 + targetMargin);
                suggestions.set(product.id, {
                    productId: product.id,
                    productName: product.name,
                    tier: product.tier,
                    currentBasePrice: product.basePrice,
                    calculatedCost: breakdown.totalCost,
                    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
                    priceChange: suggestedPrice - product.basePrice,
                    priceChangePercent: ((suggestedPrice - product.basePrice) / product.basePrice) * 100
                });
            }
        });

        return suggestions;
    }

    /**
     * Generate a detailed cost report for a single product
     * @param {Product|string|number} product
     * @param {Object} options
     * @returns {string}
     */
    generateReport(product, options = {}) {
        const breakdown = this.calculateCost(product, options);
        if (!breakdown) {
            return `Product not found: ${product}`;
        }

        const lines = [];
        lines.push(`=== Cost Analysis: ${breakdown.product.name} ===`);
        lines.push(`Tier: ${breakdown.product.tier}`);
        lines.push(`Base Price: $${breakdown.product.basePrice.toFixed(2)}`);
        lines.push('');

        if (breakdown.isRawMaterial) {
            lines.push('This is a RAW material with no production inputs.');
            lines.push(`Cost: $${breakdown.totalCost.toFixed(2)}`);
        } else {
            lines.push('Input Materials:');
            breakdown.inputs.forEach(input => {
                lines.push(`  - ${input.material}: ${input.quantity} × $${input.unitCost.toFixed(2)} = $${input.totalCost.toFixed(2)} (${input.tier})`);
            });
            lines.push('');
            lines.push(`Material Cost: $${breakdown.totalMaterialCost.toFixed(2)}`);
            lines.push(`Labor Cost: $${breakdown.laborCost.toFixed(2)} (${breakdown.product.productionTime || 1}h)`);
            lines.push(`Overhead: $${breakdown.overheadCost.toFixed(2)}`);
            lines.push(`---------------------------------`);
            lines.push(`Total Cost: $${breakdown.totalCost.toFixed(2)}`);
        }

        lines.push('');
        const margin = breakdown.product.basePrice - breakdown.totalCost;
        const marginPct = (margin / breakdown.totalCost) * 100;
        lines.push(`Profit Margin: $${margin.toFixed(2)} (${marginPct.toFixed(1)}%)`);

        if (margin < 0) {
            lines.push('⚠️ WARNING: Product is UNDERPRICED - costs exceed base price!');
        } else if (marginPct > 100) {
            lines.push('⚠️ NOTE: Product may be OVERPRICED - margin exceeds 100%');
        }

        return lines.join('\n');
    }

    /**
     * Generate a full balance report for all products
     * @param {Object} options
     * @returns {string}
     */
    generateBalanceReport(options = {}) {
        const analysis = this.analyzeAllProducts(options);
        const lines = [];

        lines.push('========================================');
        lines.push('    PRODUCT COST BALANCE REPORT');
        lines.push('========================================');
        lines.push('');

        // Summary stats
        const underpriced = analysis.filter(a => a.isUnderpriced);
        const overpriced = analysis.filter(a => a.isOverpriced);
        const balanced = analysis.filter(a => !a.isUnderpriced && !a.isOverpriced);

        lines.push('SUMMARY:');
        lines.push(`  Total Products: ${analysis.length}`);
        lines.push(`  Underpriced: ${underpriced.length}`);
        lines.push(`  Overpriced: ${overpriced.length}`);
        lines.push(`  Balanced: ${balanced.length}`);
        lines.push('');

        // Group by tier
        ['RAW', 'SEMI_RAW', 'MANUFACTURED'].forEach(tier => {
            const tierProducts = analysis.filter(a => a.product.tier === tier);
            if (tierProducts.length === 0) return;

            lines.push(`--- ${tier} ---`);
            tierProducts.forEach(a => {
                const status = a.isUnderpriced ? '❌' : (a.isOverpriced ? '⚠️' : '✓');
                const marginStr = a.marginPercent >= 0 ? `+${a.marginPercent.toFixed(0)}%` : `${a.marginPercent.toFixed(0)}%`;
                lines.push(`${status} ${a.product.name.padEnd(20)} Cost: $${a.calculatedCost.toFixed(2).padStart(10)} | Base: $${a.basePrice.toFixed(2).padStart(10)} | Margin: ${marginStr.padStart(7)}`);
            });
            lines.push('');
        });

        // Recommendations
        if (underpriced.length > 0) {
            lines.push('UNDERPRICED PRODUCTS (need price increase):');
            underpriced.forEach(a => {
                const suggested = a.calculatedCost * 1.25;
                lines.push(`  ${a.product.name}: $${a.basePrice.toFixed(2)} → $${suggested.toFixed(2)}`);
            });
            lines.push('');
        }

        if (overpriced.length > 0) {
            lines.push('POTENTIALLY OVERPRICED (margin > 100%):');
            overpriced.forEach(a => {
                const suggested = a.calculatedCost * 1.25;
                lines.push(`  ${a.product.name}: $${a.basePrice.toFixed(2)} → $${suggested.toFixed(2)}`);
            });
        }

        return lines.join('\n');
    }

    /**
     * Resolve a product from ID, name, or instance
     * @private
     */
    resolveProduct(product) {
        if (!product) return null;

        if (typeof product === 'object' && product.id) {
            return product;
        }

        if (typeof product === 'number') {
            return this.registry.getProduct(product);
        }

        if (typeof product === 'string') {
            return this.productsByName.get(product);
        }

        return null;
    }
}

/**
 * Detailed cost breakdown for a product
 */
export class ProductCostBreakdown {
    constructor(product) {
        this.product = product;
        this.inputs = [];
        this.totalMaterialCost = 0;
        this.laborCost = 0;
        this.overheadCost = 0;
        this.totalCost = 0;
        this.isRawMaterial = false;
    }

    /**
     * Get a flat list of all raw materials needed (recursively)
     * @returns {Array<{material: string, quantity: number, unitCost: number}>}
     */
    getRawMaterials() {
        const rawMaterials = new Map();

        const collectRaw = (inputs, multiplier = 1) => {
            inputs.forEach(input => {
                if (input.tier === 'RAW') {
                    const existing = rawMaterials.get(input.material) || { quantity: 0, unitCost: input.unitCost };
                    existing.quantity += input.quantity * multiplier;
                    rawMaterials.set(input.material, existing);
                } else if (input.breakdown) {
                    collectRaw(input.breakdown.inputs, input.quantity * multiplier);
                }
            });
        };

        collectRaw(this.inputs);

        return Array.from(rawMaterials.entries()).map(([material, data]) => ({
            material,
            quantity: data.quantity,
            unitCost: data.unitCost,
            totalCost: data.quantity * data.unitCost
        }));
    }

    /**
     * Get cost breakdown as percentages
     * @returns {Object}
     */
    getCostPercentages() {
        if (this.totalCost === 0) return { materials: 100, labor: 0, overhead: 0 };

        return {
            materials: (this.totalMaterialCost / this.totalCost) * 100,
            labor: (this.laborCost / this.totalCost) * 100,
            overhead: (this.overheadCost / this.totalCost) * 100
        };
    }
}
