import EventBanner from './EventBanner';
import UpdateBanner from './UpdateBanner';

const Home = () => {
  return (
    <div>
      <EventBanner />
      <UpdateBanner />
      {/* Other components can go here */}
    </div>
  );
};

export default Home;