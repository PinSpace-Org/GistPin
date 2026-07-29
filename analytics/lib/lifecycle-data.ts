export interface LifecycleStage { name: string; timestamp: Date; value: number; }
export function getLifecycleData(gistId: string): LifecycleStage[] {
  return [
    { name:'Posted', timestamp:new Date(), value:0 },
    { name:'First Reaction', timestamp:new Date(), value:5 },
    { name:'Peak Views', timestamp:new Date(), value:120 },
    { name:'Expiry', timestamp:new Date(), value:0 },
  ];
}
