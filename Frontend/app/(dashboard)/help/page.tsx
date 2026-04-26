import { serverApi } from '@/lib/server-api';
import { HelpView } from '@/components/dashboard/help/HelpView';
import { Role } from '@/types';
import { toast } from 'sonner';

export default async function HelpPage() {
    let isDoctor = false;
    try {
        const user = await serverApi.get('/users/me');
        isDoctor = user.role === Role.Doctor;
    } catch {
        toast.error('Failed to fetch user role');
    }
    
    return <HelpView isDoctor={isDoctor} />;
}
