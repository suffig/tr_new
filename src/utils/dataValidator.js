// Enhanced Data Validation Utilities for TR1 FIFA Tracker

export class DataValidator {
  // Match data validation
  static validateMatch(matchData) {
    const errors = [];
    const { date, goalsa, goalsb, teama = 'AEK', teamb = 'Real' } = matchData;

    // Date validation
    if (!date) {
      errors.push('Datum ist erforderlich');
    } else {
      const matchDate = new Date(date);
      const now = new Date();
      if (matchDate > now) {
        errors.push('Spieldatum kann nicht in der Zukunft liegen');
      }
      if (matchDate < new Date('2020-01-01')) {
        errors.push('Spieldatum ist zu weit in der Vergangenheit');
      }
    }

    // Goals validation
    if (goalsa === undefined || goalsa === null) {
      errors.push('Tore für ' + teama + ' sind erforderlich');
    } else if (!Number.isInteger(Number(goalsa)) || Number(goalsa) < 0) {
      errors.push('Tore müssen eine positive Ganzzahl sein');
    } else if (Number(goalsa) > 20) {
      errors.push('Unrealistische Toranzahl für ' + teama + ' (max. 20)');
    }

    if (goalsb === undefined || goalsb === null) {
      errors.push('Tore für ' + teamb + ' sind erforderlich');
    } else if (!Number.isInteger(Number(goalsb)) || Number(goalsb) < 0) {
      errors.push('Tore müssen eine positive Ganzzahl sein');
    } else if (Number(goalsb) > 20) {
      errors.push('Unrealistische Toranzahl für ' + teamb + ' (max. 20)');
    }

    // Card validation
    const { yellowa = 0, reda = 0, yellowb = 0, redb = 0 } = matchData;
    
    if (Number(reda) > Number(goalsa) + 5) {
      errors.push('Zu viele rote Karten für ' + teama);
    }
    if (Number(redb) > Number(goalsb) + 5) {
      errors.push('Zu viele rote Karten für ' + teamb);
    }
    if (Number(yellowa) > 10) {
      errors.push('Zu viele gelbe Karten für ' + teama + ' (max. 10)');
    }
    if (Number(yellowb) > 10) {
      errors.push('Zu viele gelbe Karten für ' + teamb + ' (max. 10)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: this.generateMatchWarnings(matchData)
    };
  }

  // Player data validation
  static validatePlayer(playerData) {
    const errors = [];
    const { name, team, value, position } = playerData;

    // Name validation
    if (!name || typeof name !== 'string') {
      errors.push('Spielername ist erforderlich');
    } else if (name.length < 2) {
      errors.push('Spielername muss mindestens 2 Zeichen lang sein');
    } else if (name.length > 50) {
      errors.push('Spielername darf maximal 50 Zeichen lang sein');
    } else if (!/^[a-zA-ZäöüßÄÖÜ\s\-\.]+$/.test(name)) {
      errors.push('Spielername enthält ungültige Zeichen');
    }

    // Team validation
    if (!team || !['AEK', 'Real', 'Former'].includes(team)) {
      errors.push('Team muss AEK, Real oder Former sein');
    }

    // Value validation
    if (value !== undefined && value !== null) {
      if (!Number.isFinite(Number(value)) || Number(value) < 0) {
        errors.push('Marktwert muss eine positive Zahl sein');
      } else if (Number(value) > 200) {
        errors.push('Unrealistischer Marktwert (max. 200M €)');
      }
    }

    // Position validation
    if (position && typeof position === 'string') {
      const validPositions = ['TW', 'IV', 'LV', 'RV', 'DM', 'ZM', 'OM', 'LM', 'RM', 'LA', 'RA', 'MS'];
      if (!validPositions.includes(position)) {
        errors.push('Ungültige Position');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: this.generatePlayerWarnings(playerData)
    };
  }

  // Financial transaction validation
  static validateTransaction(transactionData) {
    const errors = [];
    const { amount, type, team, description, date } = transactionData;

    // Amount validation
    if (amount === undefined || amount === null) {
      errors.push('Betrag ist erforderlich');
    } else if (!Number.isFinite(Number(amount))) {
      errors.push('Betrag muss eine Zahl sein');
    } else if (Math.abs(Number(amount)) > 10000000) {
      errors.push('Betrag ist unrealistisch hoch');
    }

    // Type validation
    const validTypes = ['Preisgeld', 'Strafe', 'Spielerkauf', 'Spielerverkauf', 'SdS Bonus', 'Sonstiges'];
    if (!type || !validTypes.includes(type)) {
      errors.push('Ungültiger Transaktionstyp');
    }

    // Team validation
    if (!team || !['AEK', 'Real'].includes(team)) {
      errors.push('Team muss AEK oder Real sein');
    }

    // Date validation
    if (!date) {
      errors.push('Datum ist erforderlich');
    } else {
      const transactionDate = new Date(date);
      const now = new Date();
      if (transactionDate > now) {
        errors.push('Transaktionsdatum kann nicht in der Zukunft liegen');
      }
    }

    // Description validation for certain types
    if (['Spielerkauf', 'Spielerverkauf', 'Sonstiges'].includes(type) && (!description || description.length < 3)) {
      errors.push('Beschreibung ist für diesen Transaktionstyp erforderlich');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: this.generateTransactionWarnings(transactionData)
    };
  }

  // Ban data validation
  static validateBan(banData) {
    const errors = [];
    const { player_id, player_name, type, duration, reason, date } = banData;

    // Player validation
    if (!player_id && !player_name) {
      errors.push('Spieler-ID oder Name ist erforderlich');
    }

    // Type validation
    const validTypes = ['Gelb-Rote Karte', 'Rote Karte', 'Verletzung', 'Unsportlichkeit', 'Sonstiges'];
    if (!type || !validTypes.includes(type)) {
      errors.push('Ungültiger Sperren-Typ');
    }

    // Duration validation
    if (!duration || !Number.isInteger(Number(duration)) || Number(duration) < 1) {
      errors.push('Dauer muss eine positive Ganzzahl sein');
    } else if (Number(duration) > 20) {
      errors.push('Sperrdauer ist unrealistisch lang (max. 20 Spiele)');
    }

    // Date validation
    if (!date) {
      errors.push('Datum ist erforderlich');
    }

    // Reason validation for certain types
    if (['Unsportlichkeit', 'Sonstiges'].includes(type) && (!reason || reason.length < 3)) {
      errors.push('Grund ist für diesen Sperren-Typ erforderlich');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: this.generateBanWarnings(banData)
    };
  }

  // Generate warnings for matches
  static generateMatchWarnings(matchData) {
    const warnings = [];
    const { goalsa = 0, goalsb = 0, yellowa = 0, reda = 0, yellowb = 0, redb = 0 } = matchData;

    // High-scoring game warning
    if (Number(goalsa) + Number(goalsb) > 8) {
      warnings.push('Sehr torreiches Spiel - bitte Eingabe überprüfen');
    }

    // No goals warning
    if (Number(goalsa) === 0 && Number(goalsb) === 0) {
      warnings.push('Torloses Spiel - ungewöhnlich für FIFA');
    }

    // High card count warning
    if (Number(yellowa) + Number(yellowb) + Number(reda) + Number(redb) > 8) {
      warnings.push('Sehr viele Karten - bitte Eingabe überprüfen');
    }

    // Lopsided score warning
    if (Math.abs(Number(goalsa) - Number(goalsb)) > 6) {
      warnings.push('Sehr einseitiges Ergebnis');
    }

    return warnings;
  }

  // Generate warnings for players
  static generatePlayerWarnings(playerData) {
    const warnings = [];
    const { value, name } = playerData;

    // High value warning
    if (Number(value) > 100) {
      warnings.push('Sehr hoher Marktwert - bitte überprüfen');
    }

    // Low value warning
    if (Number(value) < 5 && Number(value) > 0) {
      warnings.push('Sehr niedriger Marktwert');
    }

    // Name similarity check would go here in a real implementation
    // For now, just basic checks
    if (name && name.includes('  ')) {
      warnings.push('Name enthält doppelte Leerzeichen');
    }

    return warnings;
  }

  // Generate warnings for transactions
  static generateTransactionWarnings(transactionData) {
    const warnings = [];
    const { amount, type } = transactionData;

    // Large amount warning
    if (Math.abs(Number(amount)) > 100000) {
      warnings.push('Sehr hoher Betrag - bitte überprüfen');
    }

    // Prize money validation
    if (type === 'Preisgeld' && Number(amount) < 0) {
      warnings.push('Preisgeld ist normalerweise positiv');
    }

    // Penalty validation
    if (type === 'Strafe' && Number(amount) > 0) {
      warnings.push('Strafen sind normalerweise negativ');
    }

    return warnings;
  }

  // Generate warnings for bans
  static generateBanWarnings(banData) {
    const warnings = [];
    const { duration, type } = banData;

    // Long ban warning
    if (Number(duration) > 10) {
      warnings.push('Sehr lange Sperre');
    }

    // Injury duration warning
    if (type === 'Verletzung' && Number(duration) > 5) {
      warnings.push('Ungewöhnlich lange Verletzung');
    }

    return warnings;
  }

  // Batch validation for multiple records
  static validateBatch(data, validator) {
    const results = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    data.forEach((item, index) => {
      const result = validator(item);
      results.push({
        index,
        ...result
      });
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
    });

    return {
      results,
      summary: {
        total: data.length,
        valid: results.filter(r => r.isValid).length,
        invalid: results.filter(r => !r.isValid).length,
        totalErrors,
        totalWarnings
      }
    };
  }

  // Data consistency checks
  static checkDataConsistency(allData) {
    const issues = [];
    const { matches = [], players = [], transactions = [], bans = [] } = allData;

    // Check for player references in matches
    matches.forEach((match, index) => {
      if (match.goalslista) {
        const goalsList = typeof match.goalslista === 'string' ? 
          JSON.parse(match.goalslista) : match.goalslista;
        
        goalsList.forEach(goal => {
          const playerName = typeof goal === 'string' ? goal : goal.player;
          if (playerName && !playerName.startsWith('Eigentore_')) {
            const playerExists = players.some(p => p.name === playerName);
            if (!playerExists) {
              issues.push(`Match ${index + 1}: Spieler "${playerName}" nicht in Spielerliste gefunden`);
            }
          }
        });
      }
    });

    // Check for orphaned bans
    bans.forEach((ban, index) => {
      if (ban.player_name) {
        const playerExists = players.some(p => p.name === ban.player_name);
        if (!playerExists) {
          issues.push(`Sperre ${index + 1}: Spieler "${ban.player_name}" nicht gefunden`);
        }
      }
    });

    // Check for financial inconsistencies
    const teamFinances = transactions.reduce((acc, t) => {
      if (!acc[t.team]) acc[t.team] = 0;
      acc[t.team] += Number(t.amount || 0);
      return acc;
    }, {});

    Object.entries(teamFinances).forEach(([team, total]) => {
      if (total < -500000) {
        issues.push(`Team ${team}: Sehr negative Finanzbilanz (${total.toLocaleString('de-DE')} €)`);
      }
    });

    return {
      hasIssues: issues.length > 0,
      issues,
      summary: {
        totalIssues: issues.length,
        matchIssues: issues.filter(i => i.includes('Match')).length,
        playerIssues: issues.filter(i => i.includes('Spieler')).length,
        financialIssues: issues.filter(i => i.includes('Team')).length
      }
    };
  }

  // Form validation helpers
  static getFieldValidation(fieldName, value, context = {}) {
    switch (fieldName) {
      case 'email':
        return this.validateEmail(value);
      case 'playerName':
        return this.validatePlayerName(value);
      case 'teamName':
        return this.validateTeamName(value);
      case 'currency':
        return this.validateCurrency(value);
      case 'date':
        return this.validateDate(value, context);
      default:
        return { isValid: true, errors: [], warnings: [] };
    }
  }

  static validateEmail(email) {
    const errors = [];
    if (!email) {
      errors.push('E-Mail ist erforderlich');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Ungültige E-Mail-Adresse');
    }
    return { isValid: errors.length === 0, errors };
  }

  static validatePlayerName(name) {
    const errors = [];
    if (!name) {
      errors.push('Name ist erforderlich');
    } else if (name.length < 2) {
      errors.push('Name zu kurz');
    } else if (name.length > 50) {
      errors.push('Name zu lang');
    }
    return { isValid: errors.length === 0, errors };
  }

  static validateTeamName(team) {
    const errors = [];
    if (!['AEK', 'Real', 'Former'].includes(team)) {
      errors.push('Ungültiges Team');
    }
    return { isValid: errors.length === 0, errors };
  }

  static validateCurrency(amount) {
    const errors = [];
    if (amount && (!Number.isFinite(Number(amount)) || Number(amount) < -1000000 || Number(amount) > 1000000)) {
      errors.push('Unrealistischer Betrag');
    }
    return { isValid: errors.length === 0, errors };
  }

  static validateDate(date, context = {}) {
    const errors = [];
    if (!date) {
      errors.push('Datum ist erforderlich');
    } else {
      const dateObj = new Date(date);
      const now = new Date();
      
      if (context.allowFuture !== true && dateObj > now) {
        errors.push('Datum kann nicht in der Zukunft liegen');
      }
      
      if (context.minDate && dateObj < new Date(context.minDate)) {
        errors.push('Datum ist zu früh');
      }
    }
    return { isValid: errors.length === 0, errors };
  }
}