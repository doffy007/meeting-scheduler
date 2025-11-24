import { User, Mail, MapPin, Clock } from 'lucide-react';

export default function UserProfile({ organizer }) {
    
    if (!organizer) return null; 

    const displayName = organizer.name || (organizer.email ? organizer.email.split('@')[0] : 'Organizer');

    return (
        <div className="h-full">
            <div className="flex flex-col items-center text-center">

                <h2 className="text-xl font-bold text-gray-800 capitalize">
                    {displayName}
                </h2>
                
                <div className="flex items-center gap-2 text-gray-500 mt-2 text-sm">
                    <Mail size={14} />
                    <span>{organizer.email}</span>
                </div>

                {organizer.address && (
                    <div className="flex items-center gap-2 text-gray-500 mt-1 text-sm">
                        <MapPin size={14} />
                        <span>{organizer.address}</span>
                    </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200 w-full text-left">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Session Details
                    </h3>
                    <div className="flex items-center gap-2 text-gray-700 mb-2">
                        <Clock size={16} className="text-blue-600"/>
                        <span>{organizer.meeting_duration_minutes || 30} Mins Meeting</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                        <MapPin size={16} className="text-blue-600"/>
                        <span>{organizer.timezone || 'UTC'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}