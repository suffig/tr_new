// Match Business Logic - Enhanced from tracker_full_v1
import { supabaseDb } from './supabase';
import { addShotsFromNewMatch } from './alcoholCalculatorPersistence';
import { deleteMatch } from '../services/matchService';

export class MatchBusinessLogic {
  /**
   * Submit a match with complete business logic including:
   * - Match creation
   * - Financial transactions (Preisgeld, SdS Bonus, Echtgeld-Ausgleich)
   * - Player statistics updates
   * - Ban decrements
   * - Achievement checks
   */
  static async submitMatch(matchData) {
    const {
      date,
      teama = 'AEK',
      teamb = 'Real',
      goalsa,
      goalsb,
      goalslista = [],
      goalslistb = [],
      ownGoalsA = 0,
      ownGoalsB = 0,
      yellowa = 0,
      reda = 0,
      yellowb = 0,
      redb = 0,
      manofthematch,
      editId = null
    } = matchData;

    try {
      // 1. Calculate prize money based on tracker_full_v1 logic
      const { prizeaek, prizereal, winner, loser } = this.calculatePrizeMoney(
        goalsa, goalsb, yellowa, reda, yellowb, redb
      );

      // 2. Handle edit mode - delete old transactions and match
      if (editId) {
        await this.deleteMatchTransactions(editId);
      }

      // 3. Insert the match (including own goals in goal lists)
      // Add own goals to goal lists using the new object format
      const processedGoalsListA = [...goalslista];
      const processedGoalsListB = [...goalslistb];
      
      // Add own goals from team A (count for team B) in object format
      if (ownGoalsA > 0) {
        processedGoalsListB.push({
          count: ownGoalsA,
          player: "Eigentore_AEK"
        });
      }
      
      // Add own goals from team B (count for team A) in object format
      if (ownGoalsB > 0) {
        processedGoalsListA.push({
          count: ownGoalsB,
          player: "Eigentore_Real"
        });
      }

      const insertObj = {
        date,
        teama,
        teamb,
        goalsa: parseInt(goalsa) || 0,
        goalsb: parseInt(goalsb) || 0,
		goalslista,    // Store as object array directly for JSONB
		goalslistb,    // Store as object array directly for JSONB
        yellowa: parseInt(yellowa) || 0,
        reda: parseInt(reda) || 0,
        yellowb: parseInt(yellowb) || 0,
        redb: parseInt(redb) || 0,
        manofthematch: manofthematch || null,
        prizeaek,
        prizereal
      };

      const matchResult = await supabaseDb.insert('matches', insertObj);
      if (matchResult.error) {
        throw new Error(`Match insert failed: ${matchResult.error.message}`);
      }

      const matchId = matchResult.data?.id;
      const now = new Date().toISOString().slice(0, 10);

      // 4. Update player goals (excluding own goals which start with "Eigentore_")
      // Own goals are tracked in the goal lists but don't count for individual player statistics
      if (processedGoalsListA.length > 0) {
        // Filter out own goals for new object format or old string format
        const filteredGoalsA = processedGoalsListA.filter(goal => {
          if (typeof goal === 'object' && goal.player) {
            return !goal.player.startsWith("Eigentore_");
          }
          return !goal.startsWith("Eigentore_");
        });
        await this.updatePlayersGoals(filteredGoalsA, 'AEK');
      }
      if (processedGoalsListB.length > 0) {
        // Filter out own goals for new object format or old string format
        const filteredGoalsB = processedGoalsListB.filter(goal => {
          if (typeof goal === 'object' && goal.player) {
            return !goal.player.startsWith("Eigentore_");
          }
          return !goal.startsWith("Eigentore_");
        });
        await this.updatePlayersGoals(filteredGoalsB, 'Real');
      }

      // 5. Update spieler_des_spiels statistics
      if (manofthematch) {
        await this.updatePlayerOfTheMatchStats(manofthematch);
      }

      // 6. Process financial transactions
      await this.processFinancialTransactions({
        matchId,
        date: now,
        prizeaek,
        prizereal,
        manofthematch,
        winner,
        loser
      });

      // 7. Decrement bans after match
      await this.decrementBansAfterMatch();

      // 8. Update alcohol calculator with shots from this match
      try {
        addShotsFromNewMatch({
          id: matchId,
          goalsa: parseInt(goalsa) || 0,
          goalsb: parseInt(goalsb) || 0,
          date
        });
      } catch (alcoholError) {
        // Don't fail the match creation if alcohol calculator update fails
        console.warn('Failed to update alcohol calculator:', alcoholError);
      }

      return { success: true, matchId, message: `Match ${teama} vs ${teamb} (${goalsa}:${goalsb}) erfolgreich hinzugefügt` };

    } catch (error) {
      console.error('Error in submitMatch:', error);
      throw new Error(`Fehler beim Speichern des Matches: ${error.message}`);
    }
  }

  /**
   * Calculate prize money based on tracker_full_v1 formula
   */
  static calculatePrizeMoney(goalsa, goalsb, yellowa, reda, yellowb, redb) {
    let prizeaek = 0, prizereal = 0;
    let winner = null, loser = null;

    if (goalsa > goalsb) { 
      winner = "AEK"; 
      loser = "Real"; 
    } else if (goalsa < goalsb) { 
      winner = "Real"; 
      loser = "AEK"; 
    }

    if (winner && loser) {
      if (winner === "AEK") {
        prizeaek = 1000000 - (goalsb * 50000) - (yellowa * 20000) - (reda * 50000);
        prizereal = -(500000 + goalsa * 50000 + yellowb * 20000 + redb * 50000);
      } else {
        prizereal = 1000000 - (goalsa * 50000) - (yellowb * 20000) - (redb * 50000);
        prizeaek = -(500000 + goalsb * 50000 + yellowa * 20000 + reda * 50000);
      }
    }

    return { prizeaek, prizereal, winner, loser };
  }

  /**
   * Update player goal statistics - optimized with single query per player
   */
  static async updatePlayersGoals(goalsList, team) {
    // Handle both new object format and old string array format
    const goalCounts = {};
    
    if (goalsList.length > 0 && typeof goalsList[0] === 'object' && goalsList[0].player !== undefined) {
      // New object format: [{"count": 4, "player": "Walker"}]
      goalsList.forEach(goal => {
        if (goal.player && !goal.player.startsWith("Eigentore_")) {
          goalCounts[goal.player] = (goalCounts[goal.player] || 0) + (goal.count || 1);
        }
      });
    } else {
      // Old string array format: ["Walker", "Walker", "Messi"] 
      for (const scorer of goalsList) {
        if (!scorer || !scorer.trim() || scorer.startsWith("Eigentore_")) continue;
        goalCounts[scorer] = (goalCounts[scorer] || 0) + 1;
      }
    }
    
    // Update each player's goal count with optimized single query
    for (const [playerName, count] of Object.entries(goalCounts)) {      
      try {
        // Single query to get player data (id and current goals)
        const playerResult = await supabaseDb.select('players', 'id, goals', { 
          eq: { name: playerName, team: team } 
        });
        
        if (playerResult.data && playerResult.data.length > 0) {
          const player = playerResult.data[0];
          const newGoals = (player.goals || 0) + count;
          
          // Direct update using the player ID from the first query
          await supabaseDb.update('players', { goals: newGoals }, player.id);
        }
      } catch (error) {
        console.warn(`Failed to update goals for player ${playerName}:`, error);
      }
    }
  }

  /**
   * Update player of the match statistics
   */
  static async updatePlayerOfTheMatchStats(playerName) {
    try {
      // First, get the player's team
      const playerResult = await supabaseDb.select('players', 'team', { 
        eq: { name: playerName } 
      });
      
      if (!playerResult.data || playerResult.data.length === 0) {
        console.warn(`Player ${playerName} not found for SdS stats`);
        return;
      }

      const team = playerResult.data[0].team;

      // Check if SdS record exists
      const existingResult = await supabaseDb.select('spieler_des_spiels', '*', { 
        eq: { name: playerName, team: team } 
      });

      if (existingResult.data && existingResult.data.length > 0) {
        // Update existing record
        const existing = existingResult.data[0];
        await supabaseDb.update('spieler_des_spiels', { 
          count: existing.count + 1 
        }, existing.id);
      } else {
        // Insert new record
        await supabaseDb.insert('spieler_des_spiels', { 
          name: playerName, 
          team: team, 
          count: 1 
        });
      }
    } catch (error) {
      console.warn(`Failed to update SdS stats for ${playerName}:`, error);
    }
  }

  /**
   * Process all financial transactions for a match
   */
  static async processFinancialTransactions({ matchId, date, prizeaek, prizereal, manofthematch, winner, loser }) {
    // Get current balances
    const aekFinance = await this.getTeamFinance('AEK');
    const realFinance = await this.getTeamFinance('Real');

    let aekBalance = aekFinance.balance || 0;
    let realBalance = realFinance.balance || 0;

    // Calculate SdS bonuses
    const sdsBonusAek = manofthematch ? await this.getSdSBonus(manofthematch, 'AEK') : 0;
    const sdsBonusReal = manofthematch ? await this.getSdSBonus(manofthematch, 'Real') : 0;

    // 1. Process SdS Bonuses
    if (sdsBonusAek > 0) {
      aekBalance += sdsBonusAek;
      await this.insertTransaction({
        date,
        type: "SdS Bonus",
        team: "AEK",
        amount: sdsBonusAek,
        match_id: matchId,
        info: "SdS Bonus"
      });
      await this.updateTeamBalance('AEK', aekBalance);
    }

    if (sdsBonusReal > 0) {
      realBalance += sdsBonusReal;
      await this.insertTransaction({
        date,
        type: "SdS Bonus",
        team: "Real",
        amount: sdsBonusReal,
        match_id: matchId,
        info: "SdS Bonus"
      });
      await this.updateTeamBalance('Real', realBalance);
    }

    // 2. Process Prize Money
    if (prizeaek !== 0) {
      aekBalance += prizeaek;
      if (aekBalance < 0) aekBalance = 0;
      
      await this.insertTransaction({
        date,
        type: "Preisgeld",
        team: "AEK",
        amount: prizeaek,
        match_id: matchId,
        info: "Preisgeld"
      });
      await this.updateTeamBalance('AEK', aekBalance);
    }

    if (prizereal !== 0) {
      realBalance += prizereal;
      if (realBalance < 0) realBalance = 0;
      
      await this.insertTransaction({
        date,
        type: "Preisgeld",
        team: "Real",
        amount: prizereal,
        match_id: matchId,
        info: "Preisgeld"
      });
      await this.updateTeamBalance('Real', realBalance);
    }

    // 3. Process Echtgeld-Ausgleich (Real money compensation)
    if (winner && loser) {
      await this.processEchtgeldAusgleich({
        date,
        matchId,
        winner,
        loser,
        aekBalance,
        realBalance,
        prizeaek,
        prizereal,
        sdsBonusAek: sdsBonusAek > 0 ? 1 : 0,
        sdsBonusReal: sdsBonusReal > 0 ? 1 : 0,
        manofthematch
      });
    }
  }

  /**
   * Get team finance data
   */
  static async getTeamFinance(team) {
    const result = await supabaseDb.select('finances', '*', { eq: { team } });
    return result.data && result.data.length > 0 ? result.data[0] : { balance: 0, debt: 0 };
  }

  /**
   * Check if player gets SdS bonus
   */
  static async getSdSBonus(playerName, team) {
    const result = await supabaseDb.select('players', 'team', { eq: { name: playerName } });
    return result.data && result.data.length > 0 && result.data[0].team === team ? 100000 : 0;
  }

  /**
   * Insert a financial transaction
   */
  static async insertTransaction(transaction) {
    return await supabaseDb.insert('transactions', transaction);
  }

  /**
   * Update team balance
   */
  static async updateTeamBalance(team, balance) {
    const financeResult = await supabaseDb.select('finances', 'id', { eq: { team } });
    if (financeResult.data && financeResult.data.length > 0) {
      return await supabaseDb.update('finances', { balance }, financeResult.data[0].id);
    } else {
      // Create finance record if it doesn't exist
      return await supabaseDb.insert('finances', { team, balance, debt: 0 });
    }
  }

  /**
   * Process Echtgeld-Ausgleich calculation
   */
  static async processEchtgeldAusgleich({ date, matchId, winner, loser, aekBalance, realBalance, prizeaek, prizereal, sdsBonusAek, sdsBonusReal, manofthematch }) {
    // Get current debts
    const aekFinance = await this.getTeamFinance('AEK');
    const realFinance = await this.getTeamFinance('Real');
    
    const debts = {
      AEK: aekFinance.debt || 0,
      Real: realFinance.debt || 0
    };

    // Calculate Echtgeld amounts using tracker_full_v1 formula
    const calcEchtgeldbetrag = (balance, preisgeld, sdsBonus) => {
      let konto = balance;
      if (sdsBonus) konto += 100000;
      let zwischenbetrag = (Math.abs(preisgeld) - konto) / 100000;
      if (zwischenbetrag < 0) zwischenbetrag = 0;
      return 5 + Math.round(zwischenbetrag);
    };

    const aekBetrag = calcEchtgeldbetrag(aekBalance, prizeaek, sdsBonusAek);
    const realBetrag = calcEchtgeldbetrag(realBalance, prizereal, sdsBonusReal);

    const gewinnerBetrag = winner === "AEK" ? aekBetrag : realBetrag;
    const verliererBetrag = loser === "AEK" ? aekBetrag : realBetrag;

    const gewinnerDebt = debts[winner];
    const verliererDebt = debts[loser];

    const verrechnet = Math.min(gewinnerDebt, verliererBetrag * 1);
    const neuerGewinnerDebt = Math.max(0, gewinnerDebt - verrechnet);
    const restVerliererBetrag = verliererBetrag * 1 - verrechnet;
    const neuerVerliererDebt = verliererDebt + Math.max(0, restVerliererBetrag);

    // Update winner's debt
    const winnerFinanceResult = await supabaseDb.select('finances', 'id', { eq: { team: winner } });
    if (winnerFinanceResult.data && winnerFinanceResult.data.length > 0) {
      await supabaseDb.update('finances', { debt: neuerGewinnerDebt }, winnerFinanceResult.data[0].id);
    }

    // Add loser's debt transaction
    if (restVerliererBetrag > 0) {
      await this.insertTransaction({
        date,
        type: "Echtgeld-Ausgleich",
        team: loser,
        amount: Math.max(0, restVerliererBetrag),
        match_id: matchId,
        info: "Echtgeld-Ausgleich"
      });
      
      const loserFinanceResult = await supabaseDb.select('finances', 'id', { eq: { team: loser } });
      if (loserFinanceResult.data && loserFinanceResult.data.length > 0) {
        await supabaseDb.update('finances', { debt: neuerVerliererDebt }, loserFinanceResult.data[0].id);
      }
    }

    // Add winner's debt reduction transaction
    if (verrechnet > 0) {
      await this.insertTransaction({
        date,
        type: "Echtgeld-Ausgleich (getilgt)",
        team: winner,
        amount: -verrechnet,
        match_id: matchId,
        info: "Echtgeld-Ausgleich (getilgt)"
      });
    }
  }

  /**
   * Delete match and related transactions (for edit mode)
   * FIXED: Now uses the comprehensive deleteMatch function to ensure all data is properly cleaned up
   */
  static async deleteMatchTransactions(matchId) {
    // Use the modern deleteMatch service that handles comprehensive cleanup
    try {
      await deleteMatch(matchId);
    } catch (error) {
      console.error(`Failed to delete match ${matchId} comprehensively:`, error);
      throw error;
    }
  }

  /**
   * Decrement bans after a match
   */
  static async decrementBansAfterMatch() {
    try {
      const bansResult = await supabaseDb.select('bans', '*');
      if (!bansResult.data) return;

      for (const ban of bansResult.data) {
        if (ban.matchesserved < ban.totalgames) {
          const newMatchesServed = ban.matchesserved + 1;
          await supabaseDb.update('bans', { 
            matchesserved: newMatchesServed 
          }, ban.id);
        }
      }
    } catch (error) {
      console.warn('Failed to decrement bans:', error);
    }
  }
}