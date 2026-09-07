/** Ground Branch server configuration files under GroundBranch/ServerConfig. */
import type { Schema } from '../../formats/types';
import { b, raw, section } from '../fields';
import { addr } from '../../formats/shared';

const vote = section('/Script/RBZooKeeper.ZKVote');
const server = section('/Script/RBZooKeeper.ZKServer');
const teamKill = section('/Script/RBZooKeeper.ZKTeamKill');
const ban = section('/Script/RBZooKeeper.ZKBan');
const adminSection = '/Script/RBZooKeeper.ZKAdmin';
const rulesSection = '/Script/RBZooKeeper.ZKServer';
const rule = (key: string, label: string) => b(addr(rulesSection, `GameRules.${key}`), label);

export const groundBranchVoteSchema: Schema = [
    {
        id: 'voting',
        title: 'Voting',
        icon: 'people-group',
        fields: [
            vote.n('VoteDuration', 'Vote duration (s)'),
            vote.n('VoteSucceededTimeout', 'Successful-vote timeout (s)'),
            vote.n('VoteFailedTimeout', 'Failed-vote timeout (s)'),
        ],
    },
];

export const groundBranchServerSchema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            server.t('ServerName', 'Server name (browser)'),
            server.t('ServerMOTD', 'Server MOTD (HTML)'),
            server.t('ServerPassword', 'Join password (blank = none)'),
            server.t('SpectatorOnlyPassword', 'Spectator-only password (blank = none)'),
            server.n('MaxPlayers', 'Max players'),
            server.t('ServerWebBanner', 'Web banner URL'),
            server.n('MaxSpectators', 'Max spectators'),
        ],
    },
    {
        id: 'match',
        title: 'Match Rules',
        icon: 'sliders',
        fields: [
            rule('AllowCheats', 'Allow cheats'),
            rule('AllowDeadChat', 'Allow dead chat'),
            rule('AllowUnrestrictedRadio', 'Allow unrestricted radio'),
            rule('AllowUnrestrictedVoice', 'Allow unrestricted voice'),
            rule('SpectateEnemies', 'Allow spectating enemies'),
            rule('SpectateForceFirstPerson', 'Force first-person spectating'),
            rule('SpectateFreeCam', 'Allow free-camera spectating'),
            rule('UseTeamRestrictions', 'Use team restrictions'),
            rule('RestrictFiringRange', 'Restrict firing range'),
            rule('UseFriendlyNameTags', 'Use friendly name tags'),
            rule('AllowEnemyNPCMinimapBlips', 'Show enemy NPC minimap blips'),
            rule('BalanceTeams', 'Balance teams'),
            server.t('PVEMatchType', 'PvE match type'),
            server.n('PVERoundLimit', 'PvE round limit'),
            server.t('PVPMatchType', 'PvP match type'),
            server.n('PVPRoundLimit', 'PvP round limit'),
            server.t('PVPFFAMatchType', 'PvP FFA match type'),
            server.n('PVPFFARoundLimit', 'PvP FFA round limit'),
            server.n('ReadyCountdownTime', 'Ready countdown (s)'),
        ],
    },
    {
        id: 'shutdown',
        title: 'Scheduled Shutdown',
        icon: 'stopwatch',
        fields: [
            server.n('ServerShutdownType', 'Shutdown type'),
            server.n('ServerShutdownHour', 'Shutdown hour'),
            server.n('ServerShutdownTimeLimit', 'Shutdown time limit (h)'),
            server.n('ServerShutdownGracePeriod', 'Shutdown grace period (min)'),
        ],
    },
];

export const groundBranchTeamKillSchema: Schema = [
    {
        id: 'team-killing',
        title: 'Team Killing',
        icon: 'shield-halved',
        fields: [
            teamKill.n('MaxTeamKills', 'Maximum team kills'),
            teamKill.n('BanTime', 'Ban duration (min)'),
            teamKill.n('TeamKillExpireTime', 'Team-kill expiry (s)'),
        ],
    },
];

export const groundBranchBanSchema: Schema = [
    {
        id: 'bans',
        title: 'Ban Defaults',
        icon: 'gavel',
        fields: [ban.n('DefaultBanDuration', 'Default ban duration (min)')],
    },
];

export const groundBranchAdminSchema: Schema = [
    {
        id: 'administration',
        title: 'Administration',
        icon: 'user-shield',
        fields: [
            raw(addr(adminSection, 'AdminGroups'), 'Admin groups (last repeated entry, raw Unreal value)'),
            raw(addr(adminSection, 'Admins'), 'Admins (last repeated entry, raw Unreal value)'),
        ],
    },
];