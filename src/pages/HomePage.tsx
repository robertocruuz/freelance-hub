import { useNavigate } from 'react-router-dom';
import {
  Users, Clock, DollarSign, Briefcase, TrendingUp, ArrowUpRight,
  Plus, Download, MoreHorizontal
} from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import {
  CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie, XAxis, YAxis
} from 'recharts';

const HomePage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const data = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 5000 },
    { name: 'Apr', revenue: 2780 },
    { name: 'May', revenue: 4890 },
    { name: 'Jun', revenue: 6390 },
  ];

  const projectData = [
    { name: 'Completed', value: 400, color: '#3b9166' },
    { name: 'In Progress', value: 300, color: '#1369db' },
    { name: 'On Hold', value: 100, color: '#ff88db' },
  ];

  const stats = [
    { label: 'Revenue', value: '$12,450', icon: DollarSign, color: 'text-brand-blue', bg: 'bg-brand-blue/10', change: '+12.5%' },
    { label: 'Hours', value: '164h', icon: Clock, color: 'text-brand-pink', bg: 'bg-brand-pink/10', change: '+5.2%' },
    { label: 'Projects', value: '12', icon: Briefcase, color: 'text-brand-darkgreen', bg: 'bg-brand-darkgreen/10', change: '0%' },
    { label: 'Clients', value: '24', icon: Users, color: 'text-brand-blue', bg: 'bg-brand-blue/10', change: '+2' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 font-medium">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex gap-3">
           <button className="btn-outline flex items-center gap-2 text-sm">
             <Download className="w-4 h-4" />
             Export
           </button>
           <button
             className="btn-primary flex items-center gap-2 text-sm"
             onClick={() => navigate('/dashboard/projects')}
           >
             <Plus className="w-4 h-4" />
             New Project
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="clean-card group hover:border-brand-blue/20 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-400 mb-1">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-xs font-bold text-brand-darkgreen bg-brand-darkgreen/10 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" /> {stat.change}
              </span>
              <span className="text-xs font-medium text-slate-400">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 clean-card">
          <div className="flex items-center justify-between mb-8">
             <div>
               <h3 className="font-display font-bold text-xl text-slate-900">Revenue Analytics</h3>
               <p className="text-sm text-slate-400 font-medium">Monthly performance overview</p>
             </div>
             <select className="bg-slate-50 border-none rounded-lg px-3 py-1.5 font-semibold text-sm text-slate-600 outline-none cursor-pointer focus:ring-2 focus:ring-brand-blue/20">
                <option>Last 6 Months</option>
                <option>Last Year</option>
             </select>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1369db" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1369db" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 600}}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 600}}
                />
                <RechartsTooltip
                  cursor={{ stroke: '#1369db', strokeWidth: 2, strokeDasharray: '5 5' }}
                  contentStyle={{
                    borderRadius: '1.25rem',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    padding: '12px 16px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1369db"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Status Pie */}
        <div className="clean-card flex flex-col">
          <h3 className="font-display font-bold text-xl text-slate-900 mb-2">Project Status</h3>
          <p className="text-sm text-slate-400 font-medium mb-6">Distribution by category</p>

          <div className="flex-1 flex flex-col justify-center">
            <div className="h-[220px] w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectData}
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {projectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                  </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-slate-900">800</span>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</span>
               </div>
            </div>

            <div className="mt-8 space-y-3">
               {projectData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-semibold text-slate-600">{item.name}</span>
                     </div>
                     <span className="text-sm font-bold text-slate-900">{item.value}</span>
                  </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Recent Invoices */}
         <div className="clean-card">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-display font-bold text-xl text-slate-900">Recent Invoices</h3>
               <button
                 className="text-sm font-bold text-brand-blue hover:underline"
                 onClick={() => navigate('/dashboard/invoices')}
               >
                 View All
               </button>
            </div>
            <div className="space-y-3">
               {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform">
                          <ArrowUpRight className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="font-bold text-slate-900">Invoice #00{i}</p>
                           <p className="text-xs font-medium text-slate-400">Design Project • 2 days ago</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="font-bold text-slate-900">$1,200.00</p>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-brand-darkgreen/10 text-[10px] font-bold text-brand-darkgreen uppercase tracking-wider">
                          Paid
                        </span>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Active Budgets */}
         <div className="clean-card">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-display font-bold text-xl text-slate-900">Active Budgets</h3>
               <button
                 className="text-sm font-bold text-brand-blue hover:underline"
                 onClick={() => navigate('/dashboard/budgets')}
               >
                 View All
               </button>
            </div>
            <div className="space-y-6">
               {[
                 { label: 'Marketing Campaign', used: 75, color: 'bg-brand-blue' },
                 { label: 'Development Phase', used: 45, color: 'bg-brand-pink' },
                 { label: 'Branding Project', used: 90, color: 'bg-brand-neon' }
               ].map((budget, i) => (
                  <div key={i} className="space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-700">{budget.label}</span>
                        <span className="text-xs font-bold text-slate-400">{budget.used}% used</span>
                     </div>
                     <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${budget.color} transition-all duration-1000`}
                          style={{ width: `${budget.used}%` }}
                        />
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
