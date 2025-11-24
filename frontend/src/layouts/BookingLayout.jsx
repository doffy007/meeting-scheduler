import { useEffect, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { organizerService } from '../services/organizer.service'; 

export default function BookingLayout() {
    const { id } = useParams(); 
    
    const [organizer, setOrganizer] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrganizer = async () => {
            if (!id) return; 
            
            try {
                setLoading(true);
                const response = await organizerService.getPublicOrganizerDetail(id); 
                setOrganizer(response.data || response);
            } catch (error) {
                console.error("Error fetching organizer details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrganizer();
    }, [id]); 

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    if (!organizer) {
        return <div className="text-center mt-10">Organizer not found</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                <Outlet context={{ organizer }} />
            </div>
        </div>
    );
}