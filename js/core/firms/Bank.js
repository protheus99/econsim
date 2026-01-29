// js/core/firms/Bank.js
import { Firm } from './Firm.js';

export class Bank extends Firm {
    constructor(location, country, bankType, customId = null) {
        super('BANK', location, country, customId);
        
        this.bankType = bankType; // COMMERCIAL, INVESTMENT, CENTRAL
        this.capital = 2000000000 + Math.random() * 18000000000;
        this.reserves = this.capital * 0.10; // 10% reserve requirement
        
        // Loan portfolio
        this.loanPortfolio = new Map();
        this.totalLoansIssued = 0;
        this.totalLoanValue = 0;
        this.nonPerformingLoans = 0;
        
        // Deposit accounts
        this.deposits = 0;
        this.depositAccounts = new Map();
        
        // Interest rates
        this.baseInterestRate = country.baseInterestRate || 0.05;
        this.countryRiskPremium = country.riskPremium || 0.02;
        this.bankMargin = 0.03;
        this.lendingRate = this.calculateLendingRate();
        this.depositRate = this.baseInterestRate * 0.4;
        
        // Credit assessment parameters
        this.minCreditScore = 40;
        this.maxLoanToAssetRatio = 0.80;
        this.maxSingleLoanExposure = this.capital * 0.10;
        
        // Labor structure
        this.laborStructure = {
            loanOfficers: { count: 20, wage: 6500 },
            tellers: { count: 30, wage: 3200 },
            creditAnalysts: { count: 15, wage: 8500 },
            investmentAdvisors: { count: 10, wage: 10000 },
            riskManagers: { count: 5, wage: 12000 },
            managers: { count: 8, wage: 12000 },
            itStaff: { count: 10, wage: 7000 },
            complianceOfficers: { count: 6, wage: 9000 },
            supportStaff: { count: 17, wage: 4000 }
        };
        
        this.totalEmployees = this.calculateTotalEmployees();
        
        // Operating costs
        this.operationalExpenses = 80000;
        this.technologyCosts = 50000;
        this.complianceCosts = 30000;
        this.marketingCosts = 30000;
        this.branchOperatingCosts = 40000;
        
        // Performance metrics
        this.interestIncome = 0;
        this.interestExpense = 0;
        this.netInterestMargin = 0;
        this.returnOnAssets = 0;
        
        this.initialize();
    }
    
    calculateTotalEmployees() {
        let total = 0;
        Object.values(this.laborStructure).forEach(role => {
            total += role.count;
        });
        return total;
    }
    
    initialize() {
        this.cash = this.capital;
        this.totalAssets = this.capital;
        this.brandRating = 60; // Banks need trust
    }
    
    calculateLaborCosts() {
        let totalWages = 0;
        
        Object.entries(this.laborStructure).forEach(([role, data]) => {
            const adjustedWage = data.wage * this.city.salaryLevel;
            totalWages += data.count * adjustedWage;
        });
        
        totalWages *= 1.30;
        return totalWages;
    }
    
    calculateMonthlyOperatingCosts() {
        return (
            this.operationalExpenses +
            this.technologyCosts +
            this.complianceCosts +
            this.marketingCosts +
            this.branchOperatingCosts
        );
    }
    
    calculateLendingRate() {
        return this.baseInterestRate + this.countryRiskPremium + this.bankMargin;
    }

    produceHourly() {
        // Banks don't produce physical goods - track financial activity
        return {
            type: 'BANKING',
            activeLoans: this.loanPortfolio.size,
            deposits: this.deposits,
            capital: this.capital
        };
    }

    assessCredit(borrower) {
        let score = 50;
        
        if (borrower.type === 'FIRM' || borrower instanceof Firm) {
            // Profitability
            const profitMargin = borrower.profit / (borrower.revenue || 1);
            score += profitMargin * 30;
            
            // Asset coverage
            const assetCoverage = borrower.totalAssets / (borrower.totalLiabilities || 1);
            score += Math.min(20, assetCoverage * 10);
            
            // Liquidity
            const liquidityRatio = borrower.cash / (borrower.totalAssets || 1);
            score += liquidityRatio * 20;
            
            // Existing debt burden
            const debtRatio = borrower.totalLiabilities / (borrower.totalAssets || 1);
            score -= debtRatio * 30;
            
            // Industry risk
            const industryRisk = this.getIndustryRisk(borrower.type);
            score -= industryRisk;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    getIndustryRisk(firmType) {
        const risks = {
            'MINING': 15,
            'LOGGING': 12,
            'FARM': 10,
            'MANUFACTURING': 8,
            'RETAIL': 10,
            'BANK': 5
        };
        
        return risks[firmType] || 10;
    }
    
    calculateRiskPremium(creditScore) {
        // Lower score = higher risk = higher premium
        // Score of 100 = 0% premium, Score of 0 = 10% premium
        return (100 - creditScore) / 1000;
    }
    
    issueLoan(borrower, amount, termMonths) {
        // Check eligibility
        const creditScore = this.assessCredit(borrower);
        
        if (creditScore < this.minCreditScore) {
            return {
                approved: false,
                reason: 'INSUFFICIENT_CREDIT_SCORE',
                score: creditScore
            };
        }
        
        // Check loan size limits
        if (amount > this.maxSingleLoanExposure) {
            return {
                approved: false,
                reason: 'EXCEEDS_EXPOSURE_LIMIT',
                maxLoan: this.maxSingleLoanExposure
            };
        }
        
        // Check capital availability
        const availableCapital = this.capital - this.reserves;
        if (amount > availableCapital) {
            return {
                approved: false,
                reason: 'INSUFFICIENT_CAPITAL',
                available: availableCapital
            };
        }
        
        // Calculate loan terms
        const riskPremium = this.calculateRiskPremium(creditScore);
        const finalRate = this.lendingRate + riskPremium;
        const monthlyPayment = this.calculateMonthlyPayment(amount, finalRate, termMonths);
        
        const loan = {
            id: this.generateLoanId(),
            borrower: borrower,
            borrowerId: borrower.id,
            principal: amount,
            interestRate: finalRate,
            term: termMonths,
            monthlyPayment: monthlyPayment,
            remainingBalance: amount,
            remainingTerm: termMonths,
            issueDate: Date.now(),
            creditScore: creditScore,
            status: 'CURRENT',
            missedPayments: 0
        };
        
        // Issue the loan
        this.loanPortfolio.set(loan.id, loan);
        this.capital -= amount;
        this.totalLoansIssued++;
        this.totalLoanValue += amount;
        
        // Give cash to borrower
        borrower.cash += amount;
        borrower.totalLiabilities += amount;
        
        return {
            approved: true,
            loan: loan
        };
    }
    
    generateLoanId() {
        return `LOAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    calculateMonthlyPayment(principal, annualRate, months) {
        const monthlyRate = annualRate / 12;
        if (monthlyRate === 0) return principal / months;
        
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
               (Math.pow(1 + monthlyRate, months) - 1);
    }
    
    processMonthlyLoanPayments() {
        let totalInterestIncome = 0;
        let totalPrincipalRecovered = 0;
        const defaultedLoans = [];
        
        this.loanPortfolio.forEach((loan, loanId) => {
            const borrower = loan.borrower;
            
            // Check if borrower can pay
            if (borrower.cash >= loan.monthlyPayment) {
                // Process payment
                borrower.cash -= loan.monthlyPayment;
                
                const monthlyInterest = loan.remainingBalance * (loan.interestRate / 12);
                const principalPayment = loan.monthlyPayment - monthlyInterest;
                
                totalInterestIncome += monthlyInterest;
                totalPrincipalRecovered += principalPayment;
                
                loan.remainingBalance -= principalPayment;
                loan.remainingTerm--;
                
                borrower.totalLiabilities -= principalPayment;
                
                this.capital += loan.monthlyPayment;
                this.cash += loan.monthlyPayment;
                
                // Check if loan is paid off
                if (loan.remainingBalance <= 0 || loan.remainingTerm <= 0) {
                    loan.status = 'PAID_OFF';
                    this.loanPortfolio.delete(loanId);
                }
                
                // Reset missed payments
                loan.missedPayments = 0;
                
            } else {
                // Missed payment
                loan.missedPayments++;
                loan.status = 'DELINQUENT';
                
                // Default after 3 missed payments
                if (loan.missedPayments >= 3) {
                    loan.status = 'DEFAULT';
                    this.nonPerformingLoans++;
                    defaultedLoans.push(loanId);
                    
                    // Write off loan (partial recovery)
                    const recoveryRate = 0.30; // Recover 30% in default
                    const recovered = loan.remainingBalance * recoveryRate;
                    this.capital += recovered;
                    this.totalLoanValue -= loan.remainingBalance;
                    
                    // Remove from portfolio
                    this.loanPortfolio.delete(loanId);
                }
            }
        });
        
        this.interestIncome = totalInterestIncome;
        this.revenue += totalInterestIncome;
        this.monthlyRevenue += totalInterestIncome;
        
        return {
            interestIncome: totalInterestIncome,
            principalRecovered: totalPrincipalRecovered,
            defaults: defaultedLoans.length
        };
    }
    
    acceptDeposit(amount, accountHolder) {
        const accountId = `DEP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.depositAccounts.set(accountId, {
            holder: accountHolder,
            balance: amount,
            interestRate: this.depositRate,
            openDate: Date.now()
        });
        
        this.deposits += amount;
        this.capital += amount;
        this.cash += amount;
        
        return accountId;
    }
    
    processMonthlyDepositInterest() {
        let totalInterestPaid = 0;
        
        this.depositAccounts.forEach((account) => {
            const monthlyInterest = account.balance * (account.interestRate / 12);
            account.balance += monthlyInterest;
            totalInterestPaid += monthlyInterest;
        });
        
        this.interestExpense = totalInterestPaid;
        this.expenses += totalInterestPaid;
        this.cash -= totalInterestPaid;
        this.deposits += totalInterestPaid;
        
        return totalInterestPaid;
    }
    
    updateMonthly() {
        // Process loan payments
        const loanResults = this.processMonthlyLoanPayments();
        
        // Process deposit interest
        const depositInterest = this.processMonthlyDepositInterest();
        
        // Calculate net interest margin
        this.netInterestMargin = this.interestIncome - this.interestExpense;
        
        // Pay wages and operating costs
        super.updateMonthly();
        
        // Calculate return on assets
        this.returnOnAssets = (this.monthlyProfit / this.totalAssets) * 12; // Annualized
        
        return {
            loans: loanResults,
            depositInterest: depositInterest,
            netInterestMargin: this.netInterestMargin,
            returnOnAssets: this.returnOnAssets
        };
    }
    
    getStatus() {
        const activeLoans = Array.from(this.loanPortfolio.values());
        
        return {
            firmId: this.id,
            type: this.type,
            bankType: this.bankType,
            capital: {
                total: this.capital.toFixed(2),
                reserves: this.reserves.toFixed(2),
                available: (this.capital - this.reserves).toFixed(2)
            },
            loans: {
                count: this.loanPortfolio.size,
                totalValue: this.totalLoanValue.toFixed(2),
                nonPerforming: this.nonPerformingLoans,
                avgInterestRate: (this.lendingRate * 100).toFixed(2) + '%'
            },
            deposits: {
                total: this.deposits.toFixed(2),
                accounts: this.depositAccounts.size,
                interestRate: (this.depositRate * 100).toFixed(2) + '%'
            },
            rates: {
                lending: (this.lendingRate * 100).toFixed(2) + '%',
                deposit: (this.depositRate * 100).toFixed(2) + '%',
                margin: ((this.lendingRate - this.depositRate) * 100).toFixed(2) + '%'
            },
            performance: {
                interestIncome: this.interestIncome.toFixed(2),
                interestExpense: this.interestExpense.toFixed(2),
                netInterestMargin: this.netInterestMargin.toFixed(2),
                returnOnAssets: (this.returnOnAssets * 100).toFixed(2) + '%'
            },
            employees: this.totalEmployees,
            financials: {
                cash: this.cash.toFixed(2),
                revenue: this.revenue.toFixed(2),
                profit: this.profit.toFixed(2)
            }
        };
    }

    // Override: Get display name for this bank
    getDisplayName() {
        const bankTypeNames = {
            'COMMERCIAL': 'Commercial Bank',
            'INVESTMENT': 'Investment Bank',
            'CENTRAL': 'Central Bank'
        };
        const typeName = bankTypeNames[this.bankType] || this.bankType;
        return `${typeName} #${this.getShortId()}`;
    }
}
