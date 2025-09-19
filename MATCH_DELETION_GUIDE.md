# Match Deletion Process Guide

## Overview
The `deleteMatch` function in `matches.js` has been enhanced to ensure complete and verified deletion of matches and all related data from the database.

## What Gets Deleted When a Match is Removed

### 1. Financial Transactions
- **ALL transactions** linked to the match via `match_id` are deleted
- This includes: Preisgeld, Bonus SdS, Echtgeld-Ausgleich, and any other transaction types
- Financial impacts are **reversed** before deletion to maintain accurate team balances

### 2. Player Statistics
- **Player goals** are decremented based on match goal lists
- Supports both old string array format `["Player1", "Player2"]` and new object format `[{"player": "Player1", "count": 2}]`
- **Player of the Match (SdS)** counts are decremented

### 3. Team Finances
- **Balance changes** from all match transactions are reversed
- **Debt changes** from Echtgeld-Ausgleich transactions are reversed
- Balances never go below 0

### 4. Match Record
- The match itself is deleted from the `matches` table

## What is NOT Affected

### Ban Counters
- `matchesserved` counters in the `bans` table are **NOT** decremented
- This is by design - served ban time should not be reversed when matches are deleted
- If this behavior is needed, separate business logic would be required

### Player Cards
- Individual player card statistics (if they exist in the future) are not currently handled
- Only match-level card data is logged for reference

## Verification Process

The enhanced `deleteMatch` function includes verification steps:

1. **Transaction Verification**: Confirms all transactions with the match_id were actually deleted
2. **Match Verification**: Confirms the match record was actually deleted
3. **Detailed Logging**: Logs each step and provides a summary of what was deleted

## How to Test

### Basic Testing
Run the test script to verify function structure:
```bash
node test-delete-match.js
```

### Manual Testing in UI
1. Create a test match with transactions
2. Note the match ID and associated data (transactions, player goals, etc.)
3. Delete the match through the UI
4. Check browser console for detailed deletion logs
5. Verify in database that:
   - Match is gone from `matches` table
   - Transactions with that `match_id` are gone from `transactions` table
   - Team balances are correctly adjusted
   - Player goal counts are correctly adjusted

### Database Verification Queries

Check if match was deleted:
```sql
SELECT * FROM matches WHERE id = <match_id>;
```

Check if transactions were deleted:
```sql
SELECT * FROM transactions WHERE match_id = <match_id>;
```

Check team finances:
```sql
SELECT * FROM finances WHERE team IN ('AEK', 'Real');
```

## Common Issues and Solutions

### Issue: Transactions not deleted
**Symptoms**: Transactions still exist with the match_id after deletion
**Solution**: Check browser console for transaction deletion errors; may indicate database permission issues

### Issue: Financial balances incorrect
**Symptoms**: Team balances don't match expected values after match deletion
**Solution**: The function now processes ALL transaction types for financial reversal, not just a filtered subset

### Issue: Player goals not updated
**Symptoms**: Player goal counts unchanged after match deletion
**Solution**: Check browser console for player update errors; verify player names in goal lists match database records exactly

## Error Handling

The function includes comprehensive error handling:
- Input validation (match ID must be a number)
- Database connectivity checks
- Individual operation error handling with continuation where appropriate
- Final verification steps with failure reporting

## Logging Output

When deleting a match, you'll see detailed console output like:
```
Starting deletion of match 123
Deleting match data: {date: "2024-01-15", prizeaek: 1000, ...}
Fetching transactions for match 123 before deletion
Found 4 transactions to reverse: ["Preisgeld: 1000 (AEK)", ...]
Reversing financial changes for 4 transactions
Deleting 4 transactions for match 123
✅ Successfully deleted all transactions for match 123
✅ Updated goals for Player1 (AEK): 5 → 3
✅ Updated SdS count for Player1 (AEK): 3 → 2
Deleting match 123 from matches table
✅ Successfully deleted match 123
✅ Successfully deleted match 123 and all related data

📋 Deletion Summary for Match 123:
   - Match record: deleted
   - Transactions: 4 deleted
   - Player goals: updated for 2 AEK + 1 Real goals
   - Player of the match: updated
   - Prize money: AEK 1000, Real 0 (reversed)
   - Match date: 2024-01-15
```

This comprehensive logging helps verify that the deletion process completed successfully.