import React from 'react';
import { Card, CardContent } from './Card';

const StatCard = React.memo(({ title, value, icon: Icon, color, subtext }) => (
  <Card className="card-hover animate-fadeIn">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-3xl font-heading font-bold text-slate-900">{value}</p>
          {subtext && <p className="mt-1 text-sm text-slate-500">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

export { StatCard };
