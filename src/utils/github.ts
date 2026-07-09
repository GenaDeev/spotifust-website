// src/utils/github.ts
export async function getRepoStats() {
  const repo = 'GenaDeev/spotifust';
  const headers: Record<string, string> = { 'User-Agent': 'spotifust-website-astro' };
  
  if (import.meta.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${import.meta.env.GITHUB_TOKEN}`;
  }
  
  let stats = {
    commits: 0,
    prs: 0,
    issues: 0,
    loc: 0,
    contributors: [] as { login: string, avatar_url: string, url: string }[],
    lastCommit: { timestamp: new Date().toISOString(), author: "GenaDeev" },
    languageDistribution: [] as { name: string, percentage: number, color: string }[],
    commitActivity: [] as number[]
  };

  try {
    // 1. Contributors
    const resContrib = await fetch(`https://api.github.com/repos/${repo}/contributors`, { headers });
    if (resContrib.ok) {
      const data = await resContrib.json();
      stats.contributors = data
        .filter((c: any) => c.type !== 'Bot' && !c.login.toLowerCase().includes('[bot]'))
        .map((c: any) => ({
          login: c.login,
          avatar_url: c.avatar_url,
          url: c.html_url
        }));
    }

    // 2. Commits & Latest Commit
    const resCommits = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, { headers });
    if (resCommits.ok) {
      const data = await resCommits.json();
      if (data && data.length > 0) {
        const latest = data[0];
        const date = latest.commit?.author?.date;
        const author = latest.author?.login || latest.commit?.author?.name || 'Unknown';
        if (date) {
          stats.lastCommit = { timestamp: date, author };
        }
      }

      const linkHeader = resCommits.headers.get('link');
      if (linkHeader) {
        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (match) {
          stats.commits = parseInt(match[1], 10);
        }
      } else if (data && data.length) {
        stats.commits = data.length;
      }
    }

    // 3. Issues & PRs via Search API (to separate them)
    const [resIssues, resPRs] = await Promise.all([
      fetch(`https://api.github.com/search/issues?q=repo:${repo}+type:issue`, { headers }),
      fetch(`https://api.github.com/search/issues?q=repo:${repo}+type:pr`, { headers })
    ]);
    
    if (resIssues.ok) {
      const data = await resIssues.json();
      stats.issues = data.total_count || 0;
    }
    if (resPRs.ok) {
      const data = await resPRs.json();
      stats.prs = data.total_count || 0;
    }

    // 4. Lines of code & Language Distribution
    const resLoc = await fetch(`https://tokei.kojix2.net/api/github/${repo}`);
    if (resLoc.ok) {
      const locData = await resLoc.json();
      if (locData?.data?.languages) {
        let codeLines = 0;
        let rawLangs: {name: string, code: number}[] = [];
        
        for (const [lang, langStats] of Object.entries(locData.data.languages)) {
          if (!['Markdown', 'JSON', 'TOML', 'SVG', 'YAML', 'Plain Text', 'INI', 'BASH', 'Dockerfile', 'Makefile'].includes(lang)) {
            const code = (langStats as any).code || 0;
            codeLines += code;
            rawLangs.push({ name: lang, code });
          }
        }
        stats.loc = codeLines;
        
        stats.languageDistribution = rawLangs.map(l => {
          let color = '#ccc';
          if (l.name === 'Rust') color = '#dea584';
          else if (l.name === 'TypeScript' || l.name === 'TSX') color = '#3178c6';
          else if (l.name === 'JavaScript' || l.name === 'JSX') color = '#f1e05a';
          else if (l.name === 'CSS' || l.name === 'Sass') color = '#563d7c';
          else if (l.name === 'HTML') color = '#e34c26';
          else if (l.name === 'Astro') color = '#ff5a03';
          
          return {
            name: l.name,
            percentage: (l.code / codeLines) * 100,
            color
          };
        }).sort((a,b) => b.percentage - a.percentage);
      }
    }

    // 5. Commit Activity (Last 28 days exactly ending today in UTC)
    const last28Days = Array.from({ length: 28 }, (_, i) => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - (27 - i));
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        return {
            dateStr: d.toISOString().split('T')[0],
            count: 0,
            dayOfMonth: d.getUTCDate(),
            dateString: `${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}`
        };
    });

    const resActivity = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=100`, { headers });
    if (resActivity.ok) {
      const commitsData = await resActivity.json();
      if (Array.isArray(commitsData) && commitsData.length > 0) {
        let hasCommits = false;
        for (const item of commitsData) {
          if (item.commit?.author?.date) {
             const commitDateStr = new Date(item.commit.author.date).toISOString().split('T')[0];
             
             const targetDay = last28Days.find(d => d.dateStr === commitDateStr);
             if (targetDay) {
                 targetDay.count++;
                 hasCommits = true;
             }
          }
        }
        if (hasCommits) {
            stats.commitActivity = last28Days;
        }
      }
    }
  } catch (e) {
    console.error("Error fetching stats:", e);
  }

  // Fallbacks just in case API limit was hit
  return {
    commits: stats.commits || 45,
    prs: stats.prs || 1,
    issues: stats.issues || 0,
    loc: stats.loc || 2097,
    contributors: stats.contributors.length ? stats.contributors : [{ login: 'GenaDeev', avatar_url: 'https://avatars.githubusercontent.com/u/0?v=4', url: 'https://github.com/GenaDeev' }],
    lastCommit: stats.lastCommit,
    languageDistribution: stats.languageDistribution.length ? stats.languageDistribution : [{ name: 'Rust', percentage: 100, color: '#dea584' }],
    commitActivity: stats.commitActivity.length === 28 ? stats.commitActivity : Array.from({ length: 28 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (27 - i));
        return { 
            count: 0, 
            dayOfMonth: d.getDate(),
            dateString: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
    })
  };
}

export async function getRoadmap() {
  const repo = 'GenaDeev/spotifust';
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/main/TODO.md`);
    if (!res.ok) throw new Error("Failed to fetch TODO.md");
    const text = await res.text();
    
    const phases = [];
    let currentPhase: any = null;
    
    for (const line of text.split('\n')) {
      if (line.startsWith('### ')) {
        if (currentPhase && currentPhase.tasks.length > 0) phases.push(currentPhase);
        currentPhase = { title: line.replace(/^###\s+/, '').trim(), tasks: [], status: 'todo' };
      } else if (line.trim().startsWith('- [x] ') || line.trim().startsWith('- [ ] ')) {
        if (!currentPhase) {
          currentPhase = { title: "General", tasks: [], status: 'todo' };
        }
        const isDone = line.trim().startsWith('- [x] ');
        let content = line.trim().substring(6).trim();
        content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
        currentPhase.tasks.push({ isDone, content });
      }
    }
    if (currentPhase && currentPhase.tasks.length > 0) phases.push(currentPhase);
    
    for (const phase of phases) {
      const total = phase.tasks.length;
      const done = phase.tasks.filter((t: any) => t.isDone).length;
      if (done === total && total > 0) {
        phase.status = 'done';
      } else if (done > 0) {
        phase.status = 'wip';
      } else {
        phase.status = 'todo';
      }
    }
    
    return phases.filter((p: any) => p.title !== "General");
  } catch (e) {
    console.error("Error fetching roadmap:", e);
    return [];
  }
}
