import { showAlert } from './alerts';

const REQUEST_TIMEOUT_SEC = 5;

// const formEl = document.querySelector('.form');

const timeout = (sec) =>
  new Promise((_, reject) => {
    setTimeout(
      () => reject(Error(`Request timed out. Please try again later...`)),
      sec * 1000
    );
  });

export const useFetch = async (url, uploadData = null, method = null) => {
  try {
    const req = uploadData
      ? fetch(url, {
          method: method ? method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadData),
        })
      : fetch(url);

    const res = await Promise.race([req, timeout(REQUEST_TIMEOUT_SEC)]);
    const data = await res.json();

    if (!res.ok) throw Error(data.message);

    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch')
      err.message = `Unable to reach the server. Please check your internet connection...`;
    throw err;
  }
};

export const login = async (email, password) => {
  try {
    const res = await useFetch('http://localhost:3000/api/v1/users/login', {
      email,
      password,
    });

    if (res.status !== 'success') return;

    showAlert('success', 'Logged in successfully');

    // setTimeout(() => window.location.replace('/'), 1000);
    window.setTimeout(() => {
      location.assign('/');
    }, 1000);
  } catch (err) {
    showAlert('error', err.message);
  }
};

export const logout = async () => {
  try {
    const res = await useFetch('http://localhost:3000/api/v1/users/logout');

    if (res.status === 'success') location.reload(true);
  } catch (error) {
    showAlert('error', 'Error logging out! Try again.');
  }
};
// const handleSubmit = (e) => {
//   e.preventDefault();

//   const email = e.target.email?.value;
//   const password = e.target.password?.value;

//   login(email, password);

//   formEl.reset();
// };

// formEl.addEventListener('submit', handleSubmit);

export const updateUserData = async (data) => {
  let form = new FormData();
  form.append('name', data.name);
  form.append('email', data.email);
  form.append('photo', data.photo);

  try {
    // const res = await useFetch(
    //   'http://localhost:3000/api/v1/users/updateMe',
    //   data,
    //   'PATCH'
    // );

    // if (res.status !== 'success') return;

    const res = await fetch('http://localhost:3000/api/v1/users/updateMe', {
      method: 'PATCH',
      body: form,
    });

    const data = await res.json();
    if (!res.ok) throw Error(data.message);
    if (res.status !== 'success') return;

    showAlert('success', 'Data updated successfully');
  } catch (err) {
    showAlert('error', err.message);
  }
};

// type is either '
export const updatePassword = async (data) => {
  try {
    const res = await useFetch(
      'http://localhost:3000/api/v1/users/updateMyPassword',
      data,
      'PATCH'
    );

    if (res.status !== 'success') return;

    showAlert('success', 'Data updated successfully');
  } catch (err) {
    showAlert('error', err.message);
  }
};
