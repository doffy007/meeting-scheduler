import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader } from 'lucide-react';

import { organizerService } from '../../services/organizer.service'; 

import UserProfile from './UserProfile';
import DateSelection from './DateSelection';
import BookingForm from './BookingForm';
import Success from './Success';

export default function BookingPage() {
    const { organizerId } = useParams(); 
    
    const [organizer, setOrganizer] = useState(null);
    const [loading, setLoading] = useState(true);

    const [step, setStep] = useState(1); 
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingResult, setBookingResult] = useState(null); 

    useEffect(() => {
        const fetchData = async () => {
            if (!organizerId) return;
            try {
                setLoading(true);
                const response = await organizerService.getPublicOrganizerDetail(organizerId);
                setOrganizer(response.data || response);
            } catch (error) {
                console.error("Error fetching organizer:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [organizerId]);

    const handleDateSelect = (slot) => {
        setSelectedSlot(slot);
        setSelectedDate(new Date(slot.start)); 
        setStep(2); 
    };

    const handleBackToCalendar = () => {
        setStep(1);
        setSelectedSlot(null);
        setSelectedDate(null);
    };

    const handleBookingSuccess = (result) => {
        setBookingResult(result); 
        setStep(3); 
    };
    
    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-gray-50 text-gray-500">
                <Loader className="animate-spin mr-2" /> Loading...
            </div>
        );
    }

    if (!organizer) {
        return <div className="text-center mt-10">Organizer not found.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 md:p-8 font-sans">
            
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-gray-200">
                <div className={`${step === 3 ? "w-full" : "md:w-2/3"} p-6 md:p-10 bg-white relative`}>
                    
                    {step === 1 && (
                        <DateSelection 
                            organizerId={organizerId}
                            onSelectSlot={handleDateSelect} 
                        />
                    )}

                    {step === 2 && (
                        <BookingForm 
                            organizerId={organizerId}
                            organizer={organizer}
                            selectedDate={selectedDate}
                            selectedSlot={selectedSlot}
                            onBack={handleBackToCalendar}
                            onSuccess={handleBookingSuccess}
                        />
                    )}

                    {step === 3 && (
                        <Success 
                            booking={bookingResult}
                            organizer={organizer}
                        />
                    )}
                </div>

            </div>
        </div>
    );
}