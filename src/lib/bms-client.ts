const UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const BMS_BASE = 'https://in.bookmyshow.com/api/v3/mobile/showtimes';

export interface BMSShow {
  eventCode: string;
  eventName: string;
  dimension: string;
  date: string; // YYYYMMDD
  time: string; // HH:MM
  dateTime: string; // YYYYMMDDHHmm
  sessionId: string;
  availStatus: 'available' | 'fast-filling' | 'sold-out';
  minPrice: number;
  maxPrice: number;
  screenName: string;
  bookingUrl: string;
}

interface BMSShowTime {
  ShowTime: string;
  ShowDateTime: string;
  SessionId: string;
  AvailStatus: string;
  MinPrice: number;
  MaxPrice: number;
  ScreenName?: string;
}

interface BMSChildEvent {
  EventCode: string;
  EventName: string;
  EventDimension: string;
  ShowTimes?: BMSShowTime[];
}

interface BMSEvent {
  ChildEvents?: BMSChildEvent[];
}

interface BMSShowDetail {
  Event?: BMSEvent[];
}

interface BMSResponse {
  ShowDetails?: BMSShowDetail[];
}

export async function fetchVenueShows(
  venueCode: string,
  regionCode: string,
  dateCode: string
): Promise<BMSShow[]> {
  const url = `${BMS_BASE}/byvenue?venueCode=${venueCode}&regionCode=${regionCode}&dateCode=${dateCode}&appCode=WEB`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`BMS returned ${res.status} for ${venueCode}/${dateCode}`);
  }

  const data: BMSResponse = await res.json();
  return parseShows(data, venueCode, regionCode, dateCode);
}

function parseShows(
  data: BMSResponse,
  venueCode: string,
  regionCode: string,
  dateCode: string
): BMSShow[] {
  const shows: BMSShow[] = [];
  const details = data.ShowDetails || [];

  for (const day of details) {
    for (const event of day.Event || []) {
      for (const child of event.ChildEvents || []) {
        const dimension = child.EventDimension || '';
        if (!dimension.toUpperCase().includes('IMAX')) continue;

        for (const st of child.ShowTimes || []) {
          const status =
            st.AvailStatus === '1'
              ? 'available'
              : st.AvailStatus === '2'
                ? 'fast-filling'
                : 'sold-out';

          if (status === 'sold-out') continue;

          shows.push({
            eventCode: child.EventCode,
            eventName: child.EventName,
            dimension,
            date: dateCode,
            time: st.ShowTime,
            dateTime: st.ShowDateTime,
            sessionId: st.SessionId,
            availStatus: status,
            minPrice: st.MinPrice,
            maxPrice: st.MaxPrice,
            screenName: st.ScreenName || 'IMAX',
            bookingUrl: buildBookingUrl(child.EventCode, regionCode, dateCode),
          });
        }
      }
    }
  }

  return shows;
}

function buildBookingUrl(
  eventCode: string,
  regionCode: string,
  dateCode: string
): string {
  const regionSlug =
    regionCode === 'NCR'
      ? 'national-capital-region-ncr'
      : regionCode.toLowerCase();
  return `https://in.bookmyshow.com/${regionSlug}/movies/${eventCode}/${dateCode}`;
}
