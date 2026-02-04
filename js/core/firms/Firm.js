// js/core/firms/Firm.js
export class Firm {
    constructor(type, location, country, customId = null) {
        this.id = customId || this.generateId();
        this.type = type;
        this.location = location;
        this.country = country;
        this.city = location.city;
        
        // Financial
        this.cash = 2000000;
        this.revenue = 0;
        this.expenses = 0;
        this.profit = 0;
        this.monthlyRevenue = 0;
        this.monthlyExpenses = 0;
        this.monthlyProfit = 0;
        this.totalAssets = 100000;
        this.totalLiabilities = 0;
        
        // Labor
        this.employees = [];
        this.totalEmployees = 0;
        this.totalLaborCost = 0;
        this.wageMultiplier = 1.0;
        
        // Operations
        this.operationalExpenses = 0;
        this.equipmentCosts = 0;
        this.maintenanceCosts = 0;
        
        // Market
        this.brandRating = 30;
        this.marketingBudget = 0;
        
        // Performance
        this.efficiency = 1.0;
        this.technologyLevel = 1;
        this.qualityRating = 50;
        
        // Loans
        this.loans = [];
    }
    
    generateId() {
        return `FIRM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get a human-readable display name for this firm
    // Override in subclasses for type-specific names
    getDisplayName() {
        const abbr = this.corporationAbbreviation || '???';
        return `${abbr} ${this.type}`;
    }

    calculateLaborCosts() {
        // To be overridden by subclasses
        return 0;
    }
    
    payWages() {
        const totalWages = this.calculateLaborCosts();
        this.cash -= totalWages;
        this.expenses += totalWages;
        this.monthlyExpenses += totalWages;
        this.totalLaborCost = totalWages;
        return totalWages;
    }
    
    payOperatingExpenses() {
        const total = this.operationalExpenses + this.equipmentCosts + this.maintenanceCosts;
        this.cash -= total;
        this.expenses += total;
        this.monthlyExpenses += total;
        return total;
    }
    
    investInMarketing(amount) {
        this.marketingBudget = amount;
        this.cash -= amount;
        this.expenses += amount;
        
        // Marketing improves brand rating
        const brandIncrease = amount / 10000;
        this.brandRating = Math.min(100, this.brandRating + brandIncrease);
    }
    
    upgradeEquipment(cost) {
        if (this.cash >= cost) {
            this.cash -= cost;
            this.technologyLevel += 1;
            this.efficiency += 0.05;
            return true;
        }
        return false;
    }
    
    takeLoan(bank, amount, term) {
        const loan = bank.issueLoan(this, amount, term);
        if (loan) {
            this.loans.push(loan);
            this.cash += amount;
            this.totalLiabilities += amount;
            return true;
        }
        return false;
    }
    
    processLoanPayments() {
        let totalPayment = 0;
        
        this.loans.forEach((loan, index) => {
            if (this.cash >= loan.monthlyPayment) {
                this.cash -= loan.monthlyPayment;
                totalPayment += loan.monthlyPayment;
                
                const principal = loan.monthlyPayment - (loan.remainingBalance * loan.interestRate / 12);
                loan.remainingBalance -= principal;
                this.totalLiabilities -= principal;
                
                if (loan.remainingBalance <= 0) {
                    this.loans.splice(index, 1);
                }
            }
        });
        
        this.expenses += totalPayment;
        return totalPayment;
    }
    
    updateMonthly() {
        // Pay wages
        this.payWages();
        
        // Pay operating expenses
        this.payOperatingExpenses();
        
        // Process loan payments
        this.processLoanPayments();
        
        // Calculate profit
        this.monthlyProfit = this.monthlyRevenue - this.monthlyExpenses;
        this.profit += this.monthlyProfit;
        
        // Reset monthly counters
        this.monthlyRevenue = 0;
        this.monthlyExpenses = 0;
    }
}
