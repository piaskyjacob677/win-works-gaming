exports.filterEvents = (query, services) => {
    const queryTerms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);

    const filteredEvents = [];
    for (const [service, events] of Object.entries(services)) {
        for (const [title, data] of Object.entries(events)) {
            const lowerTitle = title.toLocaleLowerCase().trim();
            if (queryTerms.every(term => lowerTitle.includes(term))) {
                filteredEvents.push({ service, title, ...data });
            }
        }
    }

    return filteredEvents.sort((a, b) => (a.order) - (b.order));
}

exports.getFinalEvents = (query, services) => {
    const finalEvents = [];
    for (const [serviceName, events] of Object.entries(services)) {
        for (const [title, data] of Object.entries(events)) {
            if (!data.hasRotNumber) continue;

            const splits1 = title.split(" ");
            const cleaned1 = splits1[0] + " " + splits1[1] + " " + splits1[splits1.length - 2] + " " + splits1[splits1.length - 1];
            const splits2 = query.split(" ");
            const cleaned2 = splits2[0] + " " + splits2[1] + " " + splits2[splits2.length - 2] + " " + splits2[splits2.length - 1];

            if (cleaned1 == cleaned2) finalEvents.push({ serviceName, title, ...data });
        }
    }

    for (const [serviceName, events] of Object.entries(services)) {
        for (const [title, data] of Object.entries(events)) {
            if (data.hasRotNumber) continue;

            const cleaned1 = title.replace(/\[.*?\]\s*/g, '');
            const cleaned2 = query.replace(/\[.*?\]\s*/g, '');

            if (cleaned2 == cleaned1 || finalEvents.some(e => e.title.replace(/\[.*?\]\s*/g, '') == cleaned1)) finalEvents.push({ serviceName, title, ...data });
        }
    }

    return finalEvents.sort((a, b) => (b.odds) - (a.odds)).sort((a, b) => (b.points) - (a.points));
}
