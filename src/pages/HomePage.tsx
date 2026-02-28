import { useNavigate } from 'react-router-dom';
import {
  KeyRound, Users, FolderKanban, FileText, Clock, Receipt,
  TrendingUp, DollarSign, Briefcase, Calendar, CheckCircle2, ArrowUpRight
} from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';

const HomePage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const data = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 2000 },
    { name: 'Apr', revenue: 2780 },
    { name: 'May', revenue: 1890 },
    { name: 'Jun', revenue: 2390 },
  ];

  const projectData = [
    { name: 'Completed', value: 400, color: '#3b9166' },
    { name: 'In Progress', value: 300, color: '#1369db' },
    { name: 'On Hold', value: 100, color: '#ff88db' },
  ];

  const stats = [
    { label: 'Revenue', value: '$12,450', icon: DollarSign, color: 'bg-brand-blue', change: '+12.5%' },
    { label: 'Hours', value: '164h', icon: Clock, color: 'bg-brand-pink', change: '+5.2%' },
    { label: 'Projects', value: '12', icon: Briefcase, color: 'bg-brand-neon', change: '0%' },
    { label: 'Clients', value: '24', icon: Users, color: 'bg-brand-dark-green', change: '+2' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">Overview</h1>
          <p className="font-bold text-foreground/60 uppercase tracking-widest text-sm">Welcome back to your workspace</p>
        </div>
        <div className="flex gap-2">
           <button className="btn-brand bg-brand-neon">Download Report</button>
           <button className="btn-brand bg-black text-white dark:bg-white dark:text-black" onClick={() => navigate('/dashboard/projects')}>New Project</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="brand-card flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-foreground/60 mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black italic">{stat.value}</h3>
              <p className="text-[10px] font-bold text-brand-dark-green mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {stat.change} this month
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl border-[3px] border-black ${stat.color} flex items-center justify-center dark:border-white`}>
              <stat.icon className="w-6 h-6 text-black" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 brand-card">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-black italic text-xl uppercase tracking-tight">Revenue Analytics</h3>
             <select className="bg-transparent font-bold text-sm uppercase outline-none cursor-pointer">
                <option>Last 6 Months</option>
                <option>Last Year</option>
             </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1369db" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1369db" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '1rem', border: '3px solid black', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#1369db" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="brand-card">
          <h3 className="font-black italic text-xl uppercase tracking-tight mb-8">Project Status</h3>
          <div className="h-[250px] w-full flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {projectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="black" strokeWidth={3} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
             </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
             {projectData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border-2 border-black" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold uppercase">{item.name}</span>
                   </div>
                   <span className="text-xs font-black">{item.value}</span>
                </div>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="brand-card">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-black italic text-xl uppercase tracking-tight">Recent Invoices</h3>
               <button className="text-xs font-black uppercase underline decoration-2 underline-offset-4 hover:text-brand-blue" onClick={() => navigate('/dashboard/invoices')}>View All</button>
            </div>
            <div className="space-y-4">
               {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border-[3px] border-black rounded-2xl bg-[#f8f7f9] dark:bg-black/40">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand-pink border-2 border-black flex items-center justify-center font-black">#</div>
                        <div>
                           <p className="font-black text-sm uppercase">Invoice #00{i}</p>
                           <p className="text-[10px] font-bold text-foreground/50 uppercase">Project Alpha • 2 days ago</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="font-black text-sm">$1,200.00</p>
                        <p className="text-[10px] font-black text-brand-dark-green uppercase">Paid</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         <div className="brand-card">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-black italic text-xl uppercase tracking-tight">Active Budgets</h3>
               <button className="text-xs font-black uppercase underline decoration-2 underline-offset-4 hover:text-brand-blue" onClick={() => navigate('/dashboard/budgets')}>View All</button>
            </div>
            <div className="space-y-4">
               {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="font-black text-sm uppercase">Budget for Marketing</span>
                        <span className="text-xs font-bold">75% used</span>
                     </div>
                     <div className="h-6 w-full bg-black/10 rounded-full border-[3px] border-black overflow-hidden dark:bg-white/10 dark:border-white">
                        <div className="h-full bg-brand-neon border-r-[3px] border-black" style={{ width: '75%' }} />
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default HomePage;
