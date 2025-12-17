exports.filterEvents = (query, services) => {
    const queryTerms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    const filteredEvents = [];
    for (const [service, events] of Object.entries(services)) {
        for (const [title, data] of Object.entries(events)) {
            try {
                const lowerTitle = title.toLocaleLowerCase().trim();
                if (queryTerms.every(term => lowerTitle.includes(term))) {
                    filteredEvents.push({ service, title, ...data });
                }
            }
            catch (error) {
                console.error(error, title, data);
            }
        }
    }
    return filteredEvents.sort((a, b) => (a.order) - (b.order)).slice(0, 50);
}

exports.getFinalEvents = (query, services) => {
    const finalEvents = [];
    for (const [serviceName, events] of Object.entries(services)) {
        for (const [title, data] of Object.entries(events)) {
            try {
                if (data?.is_props == true) {
                    const sports = query.split("[")[0].trim();
                    const prefix = query.split("@")[0].split("]")[1].trim();
                    const suffix = "@" + query.split("@")[1].trim();
                    const lastName = prefix.split(" ").slice(-1)[0];

                    if (title.startsWith(sports) && (title.includes(lastName) || title.includes(prefix)) && title.includes(suffix)) {
                        finalEvents.push({ serviceName, title, ...data });
                    }
                }
                else {
                    if (data?.hasRotNumber == true) {
                        const splits1 = title.split(" ");
                        const cleaned1 = splits1[0] + " " + splits1[1] + " " + splits1[splits1.length - 2] + " " + splits1[splits1.length - 1];
                        const splits2 = query.split(" ");
                        const cleaned2 = splits2[0] + " " + splits2[1] + " " + splits2[splits2.length - 2] + " " + splits2[splits2.length - 1];
                        if (cleaned1 == cleaned2) {
                            finalEvents.push({ serviceName, title, ...data });
                        }
                    }
                    else {
                        const cleaned1 = title.replace(/\[.*?\]\s*/g, '');
                        const cleaned2 = query.replace(/\[.*?\]\s*/g, '');
                        if (cleaned2 == cleaned1 || finalEvents.some(e => e.title.replace(/\[.*?\]\s*/g, '') == cleaned1)) {
                            finalEvents.push({ serviceName, title, ...data });
                        }
                    }
                }
            } catch (error) {
                console.error(error, title, data);
            }
        }
    }
    return finalEvents.sort((a, b) => (b.odds) - (a.odds)).sort((a, b) => (b.points) - (a.points));
}
