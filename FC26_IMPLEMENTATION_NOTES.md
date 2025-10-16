# FC26 Season Update - Team Name Changes (Real → Rangers)

## Overview

This update implements version-aware team naming for the FC26 season. The team formerly known as "Real Madrid" in FC25 will be displayed as "Rangers" in FC26, while maintaining database consistency.

## What Changed

### Database Structure
- **No database migrations needed** - all team keys remain as `'Real'`
- Finance records continue to use `'Real'` as the team identifier
- Historical data remains intact and accessible

### Version-Aware Display
The system now automatically displays different team names based on the active FIFA version:

| Version | Team Key (DB) | Display Name | Logo |
|---------|---------------|--------------|------|
| FC25    | `'Real'`      | Real Madrid  | real_logo_transparent.png |
| FC26    | `'Real'`      | Rangers      | Custom upload via Admin |

### Updated Components

All UI components now use the version-aware `getTeamDisplay()` function:

1. **KaderTab** - Player squad lists
2. **StatsTab** - Statistics and analytics
3. **MatchesTab** - Match results
4. **FinanzenTab** - Financial transactions
5. **AddMatchTab** - Match creation form
6. **SearchTab** - Search filters
7. **AITab** - AI analysis
8. **kader.js** - Legacy player management

### Logo Management

- Rangers logo can be uploaded via **Admin > Version Team Settings**
- Supports PNG, JPG, GIF formats (max 2MB)
- Logos are version-specific - FC25 keeps Real Madrid logo, FC26 gets Rangers logo
- Custom icons are stored in localStorage and loaded per version

## Technical Implementation

### Key Files Modified

1. **src/utils/versionTeamManager.js**
   - Added FC26-specific default team configurations
   - `DEFAULT_TEAMS_FC26` sets Rangers as label for 'Real' team
   - Logo upload/removal functionality already present

2. **src/constants/teams.js**
   - Added `TEAMS_FC26` constant for FC26-specific teams
   - Maintained backward compatibility with legacy `TEAMS` constant

3. **UI Components**
   - Imported and used `getTeamDisplay()` function
   - Dynamic team name resolution based on current FIFA version
   - No hardcoded "Real Madrid" strings in UI layer

### Version Detection

The system automatically detects the current FIFA version using:
```javascript
import { getCurrentFifaVersion } from './src/utils/fifaVersionManager.js';
import { getTeamDisplay } from './src/constants/teams.js';

// Automatically shows "Real Madrid" or "Rangers" based on version
const teamName = getTeamDisplay('Real');
```

## User Instructions

### Uploading Rangers Logo

1. Navigate to **Admin** tab
2. Select **Version Team Settings**
3. Choose **FC26** from version selector
4. Find the "Real" team entry (displays as "Rangers")
5. Click "Choose File" under "Icon hochladen"
6. Select your Rangers logo (max 2MB, PNG/JPG/GIF)
7. Logo is automatically uploaded and saved

### Switching Between Versions

- Use **Admin > FIFA Version Manager** to switch between FC25 and FC26
- Team names and logos automatically update throughout the app
- No data loss when switching versions

## Finance Database

As mentioned, the finance database already handles this correctly:
- All transactions use `'Real'` as the team key
- Display layer shows "Real Madrid" (FC25) or "Rangers" (FC26)
- No data migration or updates needed

## Testing

### Build Status
✅ Successfully built with no errors
```bash
npm run build
# ✓ built in 4.11s
```

### Verified Components
- All team display logic updated
- Logo upload functionality tested
- Version switching mechanism working
- Database queries use correct team keys

## Backward Compatibility

The implementation maintains full backward compatibility:
- Legacy `TEAMS` constant still available
- FC25 users see "Real Madrid" (no change)
- Database structure unchanged
- All existing data remains valid

## Documentation

Comprehensive German documentation provided in:
- **FC26_TEAM_SETUP_GUIDE.md** - Detailed user guide (German)

## Future Enhancements

Potential future improvements:
- Additional version-specific customizations
- Batch logo upload/export
- Team color customization per version
- Historical team name tracking

## Support

For questions or issues:
1. Check **FC26_TEAM_SETUP_GUIDE.md** for detailed instructions
2. Verify FIFA version is set to FC26
3. Ensure browser cache is cleared after logo upload
4. Create an issue in the repository if problems persist
