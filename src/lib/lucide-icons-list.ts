
export type IconData = {
  name: string;
  tags: string[];
};

export type IconCategory = {
  name: string;
  icons: IconData[];
};

export const iconCategories: IconCategory[] = [
  {
    name: 'ビジネス',
    icons: [
      { name: 'Award', tags: ['achievement', 'badge', 'prize', 'winner'] },
      { name: 'Briefcase', tags: ['work', 'bag', 'portfolio'] },
      { name: 'Building', tags: ['company', 'office', 'construction'] },
      { name: 'Building2', tags: ['company', 'office', 'city'] },
      { name: 'Calculator', tags: ['math', 'account', 'abacus'] },
      { name: 'Calendar', tags: ['date', 'day', 'month', 'year', 'event'] },
      { name: 'ClipboardList', tags: ['task', 'check', 'to-do', 'report'] },
      { name: 'Factory', tags: ['industry', 'production', 'manufacture'] },
      { name: 'FileText', tags: ['document', 'paper', 'report', 'contract'] },
      { name: 'Folder', tags: ['directory', 'files', 'storage'] },
      { name: 'Globe', tags: ['world', 'earth', 'international', 'global'] },
      { name: 'Handshake', tags: ['agreement', 'deal', 'partnership'] },
      { name: 'Landmark', tags: ['building', 'monument', 'capitol', 'bank'] },
      { name: 'Mail', tags: ['email', 'message', 'letter', 'inbox'] },
      { name: 'MessageSquare', tags: ['comment', 'chat', 'feedback', 'talk'] },
      { name: 'Network', tags: ['web', 'connection', 'social'] },
      { name: 'Phone', tags: ['call', 'contact', 'telephone'] },
      { name: 'Presentation', tags: ['slideshow', 'whiteboard', 'meeting'] },
      { name: 'Printer', tags: ['fax', 'office', 'device'] },
      { name: 'Target', tags: ['goal', 'aim', 'objective', 'bullseye'] },
      { name: 'TrendingUp', tags: ['growth', 'increase', 'graph', 'analytics'] },
      { name: 'Wallet', tags: ['money', 'finance', 'cash', 'purse'] },
    ],
  },
  {
    name: 'ユーザー',
    icons: [
      { name: 'Contact', tags: ['user', 'address book', 'profile'] },
      { name: 'Heart', tags: ['like', 'love', 'favorite'] },
      { name: 'Medal', tags: ['award', 'prize', 'winner', 'first place'] },
      { name: 'Smile', tags: ['face', 'happy', 'emoji', 'emotion'] },
      { name: 'Star', tags: ['favorite', 'rating', 'like', 'achievement'] },
      { name: 'ThumbsUp', tags: ['like', 'approve', 'ok', 'good'] },
      { name: 'Trophy', tags: ['award', 'prize', 'winner', 'achievement'] },
      { name: 'User', tags: ['person', 'account', 'profile', 'member'] },
      { name: 'UserCog', tags: ['admin', 'settings', 'management'] },
      { name: 'UserPlus', tags: ['add', 'new', 'invite', 'member'] },
      { name: 'Users', tags: ['group', 'team', 'people', 'members'] },
    ],
  },
  {
    name: '開発',
    icons: [
      { name: 'Code', tags: ['source', 'html', 'brackets', 'programming'] },
      { name: 'Cog', tags: ['settings', 'gear', 'options', 'edit'] },
      { name: 'Component', tags: ['part', 'block', 'module', 'package'] },
      { name: 'Computer', tags: ['desktop', 'monitor', 'pc', 'screen'] },
      { name: 'Database', tags: ['storage', 'data', 'server'] },
      { name: 'ExternalLink', tags: ['outbound', 'share', 'new tab'] },
      { name: 'Filter', tags: ['funnel', 'sort', 'options'] },
      { name: 'GitBranch', tags: ['version control', 'commit', 'code'] },
      { name: 'Github', tags: ['logo', 'version control', 'code'] },
      { name: 'HardDrive', tags: ['computer', 'server', 'storage'] },
      { name: 'Keyboard', tags: ['typing', 'input', 'computer'] },
      { name: 'Link', tags: ['url', 'chain', 'connect', 'attach'] },
      { name: 'Mouse', tags: ['computer', 'click', 'pointer'] },
      { name: 'Rocket', tags: ['launch', 'release', 'space', 'fast'] },
      { name: 'Save', tags: ['diskette', 'floppy', 'store'] },
      { name: 'Server', tags: ['storage', 'data', 'computer'] },
      { name: 'Shield', tags: ['security', 'protection', 'guard', 'defense'] },
      { name: 'Terminal', tags: ['code', 'command', 'console', 'bash'] },
      { name: 'Wrench', tags: ['tool', 'fix', 'settings', 'spanner'] },
    ],
  },
  {
    name: 'アイデア',
    icons: [
      { name: 'Book', tags: ['read', 'library', 'dictionary', 'knowledge'] },
      { name: 'Brain', tags: ['mind', 'intellect', 'ai', 'idea'] },
      { name: 'CreativeCommons', tags: ['license', 'copyright'] },
      { name: 'Feather', tags: ['light', 'write', 'pen', 'quill'] },
      { name: 'Film', tags: ['movie', 'video', 'cinema', 'media'] },
      { name: 'Flag', tags: ['report', 'mark', 'country', 'nation'] },
      { name: 'Flame', tags: ['fire', 'hot', 'popular', 'trending'] },
      { name: 'Lightbulb', tags: ['idea', 'inspiration', 'thought'] },
      { name: 'PenTool', tags: ['vector', 'drawing', 'design'] },
      { name: 'Quote', tags: ['quotation', 'cite', 'block'] },
      { name: 'Sparkles', tags: ['magic', 'ai', 'stars', 'shiny', 'glitter'] },
      { name: 'Zap', tags: ['flash', 'lightning', 'charge', 'fast'] },
    ],
  },
   {
    name: '矢印',
    icons: [
      { name: 'ArrowDown', tags: ['south'] },
      { name: 'ArrowLeft', tags: ['west', 'previous'] },
      { name: 'ArrowRight', tags: ['east', 'next'] },
      { name: 'ArrowUp', tags: ['north', 'top'] },
      { name: 'ChevronDown', tags: ['expand', 'more'] },
      { name: 'ChevronLeft', tags: ['back', 'previous'] },
      { name: 'ChevronRight', tags: ['forward', 'next'] },
      { name: 'ChevronsRight', tags: ['next', 'skip'] },
      { name: 'ChevronUp', tags: ['collapse', 'less'] },
      { name: 'CornerDownRight', tags: ['indent', 'reply'] },
      { name: 'Move', tags: ['arrows', 'drag', 'reorder'] },
      { name: 'Reply', tags: ['answer'] },
      { name: 'RefreshCw', tags: ['reload', 'sync', 'rotate'] },
      { name: 'Undo', tags: ['back', 'revert'] },
    ],
  },
  {
    name: 'その他',
    icons: [
      { name: 'Bell', tags: ['notification', 'alarm', 'alert'] },
      { name: 'Check', tags: ['tick', 'correct', 'done', 'todo'] },
      { name: 'Edit', tags: ['pen', 'pencil', 'write', 'change'] },
      { name: 'GripVertical', tags: ['drag', 'handle', 'reorder'] },
      { name:...