// Match Service - Modern ES6 module for match operations
import { supabaseDb } from '../utils/supabase';

/**
 * Comprehensive match deletion with complete data integrity
 * This ensures all related data is properly cleaned up when deleting a match
 */
export async function deleteMatch(id) {
  try {
    console.log(`Starting deletion of match ${id}`);
    
    // Input validation and type conversion
    if (id === null || id === undefined) {
      throw new Error('No match ID provided for deletion');
    }
    
    console.log(`Processing match ID for deletion: ${id} (type: ${typeof id})`);
    
    // Convert various ID types to a valid format for Supabase
    let matchId;
    if (typeof id === 'string') {
      if (id.trim() === '') {
        throw new Error('Empty string provided as match ID');
      }
      matchId = parseInt(id, 10);
      // Check if parseInt returned NaN
      if (isNaN(matchId)) {
        throw new Error(`Invalid match ID string: "${id}" cannot be converted to number`);
      }
    } else if (typeof id === 'bigint') {
      // For very large BigInt values, check if conversion to Number loses precision
      const numberValue = Number(id);
      if (BigInt(numberValue) === id) {
        // Safe to convert - no precision loss
        matchId = numberValue;
      } else {
        // Keep as BigInt for very large values - Supabase can handle this
        matchId = id;
      }
    } else if (typeof id === 'number') {
      matchId = id;
    } else {
      throw new Error(`Unsupported match ID type: ${typeof id}. Expected string, number, or bigint.`);
    }
    
    // Validate the final ID - handle both Number and BigInt types
    const isValidNumber = typeof matchId === 'number' && Number.isInteger(matchId) && matchId > 0;
    const isValidBigInt = typeof matchId === 'bigint' && matchId > 0n;
    
    if (!isValidNumber && !isValidBigInt) {
      throw new Error(`Invalid match ID after conversion: ${matchId} (type: ${typeof matchId}). Must be a positive integer.`);
    }
    
    console.log(`Converted match ID: ${matchId} (type: ${typeof matchId})`);
    
    // 1. Fetch match data for validation and cleanup
    const { data: matchesArray, error: matchError } = await supabaseDb.select('matches', 
      'date,prizeaek,prizereal,goalslista,goalslistb,manofthematch,yellowa,reda,yellowb,redb', 
      { id: matchId });

    if (matchError) {
      console.error('Error fetching match:', matchError);
      throw matchError;
    }

    if (!matchesArray || matchesArray.length === 0) {
      const errorMsg = `Match with ID ${matchId} not found in database`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const match = matchesArray[0];
    
    // Validate match data
    if (!match.date) {
      console.warn(`Match ${matchId} has no date - this may cause issues with transaction cleanup`);
    }

    console.log(`Deleting match data:`, match);

    // 2. Fetch all transactions for this match BEFORE deleting them (needed for financial reversals)
    console.log(`Fetching transactions for match ${matchId} before deletion`);
    const { data: allMatchTransactions, error: fetchTransError } = await supabaseDb.select('transactions', 
      'team,amount,type', 
      { match_id: matchId });
    
    if (fetchTransError) {
      console.error('Error fetching transactions:', fetchTransError);
      throw fetchTransError;
    }
    
    // Use ALL match transactions for financial reversal - don't filter by type
    const matchTransactions = allMatchTransactions || [];
    console.log(`Found ${matchTransactions.length} transactions to reverse:`, matchTransactions.map(t => `${t.type}: ${t.amount} (${t.team})`));

    // 3. Reverse financial changes (balance/debt changes, never under 0!)
    console.log(`Reversing financial changes for ${matchTransactions?.length || 0} transactions`);
    
    if (matchTransactions && matchTransactions.length > 0) {
      for (const trans of matchTransactions) {
        if (trans.type === 'Echtgeld-Ausgleich') {
          // For debt transactions, we need to reduce the debt
          const { data: teamFinances, error: finError } = await supabaseDb.select('finances', 'debt', { team: trans.team });
          
          if (finError) {
            console.error(`Error fetching finances for team ${trans.team}:`, finError);
            continue;
          }
          
          const teamFin = teamFinances && teamFinances.length > 0 ? teamFinances[0] : null;
          const oldDebt = teamFin?.debt || 0;
          let newDebt = oldDebt - trans.amount;
          if (newDebt < 0) newDebt = 0;
          
          await supabaseDb.update('finances', { debt: newDebt }, { team: trans.team });
        } else {
          // For other transactions, reverse the balance change
          const { data: teamFinances, error: finError } = await supabaseDb.select('finances', 'balance', { team: trans.team });
          
          if (finError) {
            console.error(`Error fetching finances for team ${trans.team}:`, finError);
            continue;
          }
          
          const teamFin = teamFinances && teamFinances.length > 0 ? teamFinances[0] : null;
          const oldBalance = teamFin?.balance || 0;
          let newBalance = oldBalance - trans.amount;
          if (newBalance < 0) newBalance = 0;
          
          await supabaseDb.update('finances', { balance: newBalance }, { team: trans.team });
        }
      }
    }

    // Also handle prize money from match data (in case transactions weren't recorded properly)
    if (typeof match.prizeaek === "number" && match.prizeaek !== 0) {
      const { data: aekFinances, error: aekFinError } = await supabaseDb.select('finances', 'balance', { team: 'AEK' });
      
      if (aekFinError) {
        console.error('Error fetching AEK finances:', aekFinError);
      } else if (aekFinances && aekFinances.length > 0) {
        const aekFin = aekFinances[0];
        let newBal = (aekFin?.balance || 0) - match.prizeaek;
        if (newBal < 0) newBal = 0;
        await supabaseDb.update('finances', { balance: newBal }, { team: 'AEK' });
      }
    }
    if (typeof match.prizereal === "number" && match.prizereal !== 0) {
      const { data: realFinances, error: realFinError } = await supabaseDb.select('finances', 'balance', { team: 'Real' });
      
      if (realFinError) {
        console.error('Error fetching Real finances:', realFinError);
      } else if (realFinances && realFinances.length > 0) {
        const realFin = realFinances[0];
        let newBal = (realFin?.balance || 0) - match.prizereal;
        if (newBal < 0) newBal = 0;
        await supabaseDb.update('finances', { balance: newBal }, { team: 'Real' });
      }
    }

    // 4. Delete the transactions
    console.log(`Deleting ${matchTransactions?.length || 0} transactions for match ${matchId}`);
    const { error: transactionError } = await supabaseDb.delete('transactions', { match_id: matchId });
    
    if (transactionError) {
      console.error('Error deleting transactions:', transactionError);
      throw transactionError;
    }

    // Verify transactions were actually deleted
    const { data: remainingTransactions, error: verifyError } = await supabaseDb.select('transactions', 'id', { match_id: matchId });
    
    if (verifyError) {
      console.warn('Could not verify transaction deletion:', verifyError);
    } else if (remainingTransactions && remainingTransactions.length > 0) {
      console.error(`❌ Failed to delete ${remainingTransactions.length} transactions for match ${matchId}`);
      throw new Error(`Transaction deletion incomplete: ${remainingTransactions.length} transactions still exist`);
    } else {
      console.log(`✅ Successfully deleted all transactions for match ${matchId}`);
    }

    // 5. Subtract goals from player statistics
    const removeGoals = async (goalslist, team) => {
      if (!goalslist || !Array.isArray(goalslist)) return;
      
      // Count goals per player - handle both new object format and old string array format
      const goalCounts = {};
      
      if (goalslist.length > 0 && typeof goalslist[0] === 'object' && goalslist[0].player !== undefined) {
        // New object format: [{"count": 4, "player": "Walker"}]
        goalslist.forEach(goal => {
          if (goal.player) {
            goalCounts[goal.player] = (goalCounts[goal.player] || 0) + (goal.count || 1);
          }
        });
      } else {
        // Old string array format: ["Walker", "Walker", "Messi"]
        for (const playerName of goalslist) {
          if (!playerName) continue;
          goalCounts[playerName] = (goalCounts[playerName] || 0) + 1;
        }
      }
      
      // Remove each player's goal count
      for (const [playerName, count] of Object.entries(goalCounts)) {
        const { data: players, error: playerError } = await supabaseDb.select('players', 'goals', { name: playerName, team: team });
        
        if (playerError) {
          console.error(`Error fetching player ${playerName} for goal removal:`, playerError);
          continue;
        }
        
        if (!players || players.length === 0) {
          console.warn(`Player ${playerName} not found in team ${team} for goal removal`);
          continue;
        }
        
        const player = players[0];
        let newGoals = (player?.goals || 0) - count;
        if (newGoals < 0) newGoals = 0;
        
        const { error: updateError } = await supabaseDb.update('players', { goals: newGoals }, { name: playerName, team: team });
        if (updateError) {
          console.error(`Error updating goals for player ${playerName}:`, updateError);
        } else {
          console.log(`✅ Updated goals for ${playerName} (${team}): ${player.goals} → ${newGoals}`);
        }
      }
    };
    await removeGoals(match.goalslista, "AEK");
    await removeGoals(match.goalslistb, "Real");

    // 6. Reverse "Spieler des Spiels" (Man of the Match) statistics
    if (match.manofthematch) {
      let sdsTeam = null;
      
      // Helper function to check if player is in goals list - handle both object and string array formats
      const checkPlayerInGoals = (goalsList, playerName) => {
        if (!goalsList || !goalsList.length) return false;
        // Handle object format: [{"count": 1, "player": "Kante"}]
        if (typeof goalsList[0] === 'object' && goalsList[0].player !== undefined) {
          return goalsList.some(goal => goal.player === playerName);
        }
        // Handle string array format: ["Kante", "Walker"]
        return goalsList.includes(playerName);
      };
      
      if (checkPlayerInGoals(match.goalslista, match.manofthematch)) sdsTeam = "AEK";
      else if (checkPlayerInGoals(match.goalslistb, match.manofthematch)) sdsTeam = "Real";
      else {
        // Fallback: check if player is in AEK or Real team
        const { data: players, error: playerError } = await supabaseDb.select('players', 'team', { name: match.manofthematch });
        
        if (playerError) {
          console.error(`Error fetching player ${match.manofthematch} for team lookup:`, playerError);
        } else if (players && players.length > 0) {
          sdsTeam = players[0].team;
        } else {
          console.warn(`Player ${match.manofthematch} not found for SdS team determination`);
        }
      }
      if (sdsTeam) {
        const { data: sdsEntries, error: sdsError } = await supabaseDb.select('spieler_des_spiels', 'count', { name: match.manofthematch, team: sdsTeam });
        
        if (sdsError) {
          console.error(`Error fetching SdS entry for ${match.manofthematch}:`, sdsError);
        } else if (sdsEntries && sdsEntries.length > 0) {
          const sds = sdsEntries[0];
          const newCount = Math.max(0, sds.count - 1);
          
          const { error: updateError } = await supabaseDb.update('spieler_des_spiels', { count: newCount }, { name: match.manofthematch, team: sdsTeam });
          if (updateError) {
            console.error(`Error updating SdS count for ${match.manofthematch}:`, updateError);
          } else {
            console.log(`✅ Updated SdS count for ${match.manofthematch} (${sdsTeam}): ${sds.count} → ${newCount}`);
          }
        } else {
          console.warn(`SdS entry for ${match.manofthematch} in team ${sdsTeam} not found`);
        }
      }
    }

    // 7. Cards handling
    if (match.yellowa > 0 || match.reda > 0 || match.yellowb > 0 || match.redb > 0) {
      console.log(`Match had cards: AEK(${match.yellowa}Y,${match.reda}R) Real(${match.yellowb}Y,${match.redb}R)`);
      // Note: Individual player card statistics would be decremented here if they exist
    }

    // 8. Delete the match record
    console.log(`Deleting match ${matchId} from matches table`);
    const { error: deleteError } = await supabaseDb.delete('matches', { id: matchId });
    if (deleteError) {
      console.error('Error deleting match:', deleteError);
      throw deleteError;
    }
    
    // Verify the match was actually deleted
    const { data: remainingMatch, error: verifyMatchError } = await supabaseDb.select('matches', 'id', { id: matchId });
    
    if (verifyMatchError) {
      console.warn('Could not verify match deletion:', verifyMatchError);
    } else if (remainingMatch && remainingMatch.length > 0) {
      console.error(`❌ Failed to delete match ${matchId}`);
      throw new Error(`Match deletion failed: match ${matchId} still exists`);
    } else {
      console.log(`✅ Successfully deleted match ${matchId}`);
    }
    
    console.log(`✅ Successfully deleted match ${matchId} and all related data`);
    
    // Summary of what was deleted
    console.log(`📋 Deletion Summary for Match ${matchId}:`);
    console.log(`   - Match record: deleted`);
    console.log(`   - Transactions: ${matchTransactions.length} deleted`);
    console.log(`   - Player goals: updated for ${match.goalslista?.length || 0} AEK + ${match.goalslistb?.length || 0} Real goals`);
    console.log(`   - Player of the match: ${match.manofthematch ? 'updated' : 'none'}`);
    console.log(`   - Prize money: AEK ${match.prizeaek || 0}, Real ${match.prizereal || 0} (reversed)`);
    console.log(`   - Match date: ${match.date}`);
    
  } catch (error) {
    const safeMatchId = typeof matchId !== 'undefined' ? matchId : id || 'unknown';
    console.error(`Failed to delete match ${safeMatchId}:`, error);
    console.error('Error details:', {
      matchId: typeof matchId !== 'undefined' ? matchId : 'undefined',
      matchIdType: typeof matchId,
      originalId: id,
      originalIdType: typeof id,
      errorMessage: error.message,
      errorStack: error.stack
    });
    
    throw error;
  }
}