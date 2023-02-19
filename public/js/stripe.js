import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51Mbmt0HQd2MuRgytHSEZBZBBXff8Kh9K4vPiXIZSqySt38atNcTnmXYT2NK5jJotwRqTrGt0cFF7nrKsXg8horma00ADNknIKo'
);

export const bookTour = async (tourId) => {
  try {
    const session = await axios(
      `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`
    );

    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('err', err);
  }
};
