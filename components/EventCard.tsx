import Link from "next/link";
import Image from "next/image";

interface Props {
    title: string;
    image: string;
    slug: string;
    location: string;
    date: string;
    time: string;
}

const EventCard = ({ title, image , slug, time, date, location}: Props) => {
    return (
        <Link href={`/events${slug}`} id="event-card">
            <Image className="poster" src={image} alt={title} width={410} height={300} />
            <div className="flex flex-row gap-2">
                <Image src="/icons/pin.svg" alt="location" width={16} height={16} />
                <p>{location}</p>
            </div>

            <p className="title">{title}</p>

            <div className="datetime">
                <div>
                    <Image src="/icons/calendar.svg" alt="date" width={16} height={16} />
                    {date}
                </div>

                <div>
                    <Image src="/icons/clock.svg" alt="time" width={16} height={16} />
                    {time}
                </div>
            </div>
        </Link>
    )
}
export default EventCard
