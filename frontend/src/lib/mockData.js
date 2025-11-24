export const MOCK_BOOKINGS = [
    {
        id: 1,
        guestName: 'Alice Smith',
        guestEmail: 'alice@example.com',
        date: '2025-11-25',
        time: '10:00',
        duration: 30,
        status: 'upcoming',
        type: '30 Min Meeting'
    },
    {
        id: 2,
        guestName: 'Bob Jones',
        guestEmail: 'bob@example.com',
        date: '2025-11-26',
        time: '14:00',
        duration: 15,
        status: 'upcoming',
        type: '15 Min Check-in'
    },
    {
        id: 3,
        guestName: 'Charlie Brown',
        guestEmail: 'charlie@example.com',
        date: '2025-11-20',
        time: '11:00',
        duration: 60,
        status: 'past',
        type: 'Strategy Session'
    },
    {
        id: 4,
        guestName: 'David Lee',
        guestEmail: 'david@example.com',
        date: '2025-11-28',
        time: '09:00',
        duration: 30,
        status: 'cancelled',
        type: '30 Min Meeting'
    }
];

export const MOCK_EVENT_TYPES = [
    {
        id: 1,
        title: '15 Min Meeting',
        slug: '15min',
        duration: 15,
        description: 'Short check-in call.'
    },
    {
        id: 2,
        title: '30 Min Meeting',
        slug: '30min',
        duration: 30,
        description: 'Standard meeting slot.'
    },
    {
        id: 3,
        title: 'Secret Strategy',
        slug: 'secret',
        duration: 60,
        description: 'Long term planning.'
    }
];
