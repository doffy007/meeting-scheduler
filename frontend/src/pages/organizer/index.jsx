import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Clock, MapPin, User } from "lucide-react";
import { organizerService } from "../../services/organizer.service";

export default function OrganizerIndex() {
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await organizerService.getPublicOrganizer(search);
      setOrganizers(res.data.data || []);
    } catch (err) {
      console.error("Error fetch organizer:", err);
      setOrganizers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleBookMeeting = (organizerId) => {
    navigate(`/organizer/${organizerId}`); 
  };

  if (loading) {
    return <div className="text-center py-20">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold mb-4">Find someone to meet</h1>
        <p className="text-xl text-gray-600 mb-8">
          Search for public organizers and book a time slot easily.
        </p>

        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
          <Search 
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
            size={20} 
          />
          <input
            type="text"
            placeholder="Search by name..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        {organizers.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No organizers found. Try a different search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {organizers.map((org) => (
              <div
                key={org.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={32} className="text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {org.organizer_name || org.name || "Organizer"}
                    </h3>
                    <p className="text-gray-600 text-sm">{org.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>{org.meeting_duration_minutes || 30} mins</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin size={16} />
                    <span>{org.timezone || "Asia/Jakarta"}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBookMeeting(org.id)}
                  className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  Book Meeting →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}