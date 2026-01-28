export interface Season {
  id?: string;
  name: string;
  isActive: boolean;
  startDate: string; 
  endDate: string;
  createdAt: any; // Usaremos serverTimestamp() de Firebase
}