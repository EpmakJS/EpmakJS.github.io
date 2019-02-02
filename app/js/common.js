$(function() {
	firebase.auth().onAuthStateChanged(function(user) {
		if (user) {
			document.getElementById('user-logged').style.display = 'block';
			document.getElementById('auth-form').style.display = 'none';

			let user = firebase.auth().currentUser;
			let name = user.displayName;
			let lastSignInTime = user.metadata.lastSignInTime;
			let uid = user.providerData[0].uid;

			db.collection('users').get().then((snap) => {
				if(!snap.docs.some(doc => doc.data().uid == uid)) {
					db.collection('users').add({
						name: name,
						lastVisit: lastSignInTime,
						uid: uid,
						isBlocked: false
					});
				}
			})

		} else {
			document.getElementById('user-logged').style.display = 'none';
			document.getElementById('auth-form').style.display = 'block';
		}
	});

	
	$("#fblogin").click(function(event){
		event.preventDefault();

		var provider = new firebase.auth.FacebookAuthProvider();
		firebase.auth().signInWithRedirect(provider);

		firebase.auth().getRedirectResult().then(function(result) {
			if (result.credential) {
			// This gives you a Facebook Access Token. You can use it to access the Facebook API.
			var token = result.credential.accessToken;
			}
			// The signed-in user info.
			var user = result.user;
		}).catch(function(error) {
			// Handle Errors here.
			var errorCode = error.code;
			var errorMessage = error.message;
			// The email of the user's account used.
			var email = error.email;
			// The firebase.auth.AuthCredential type that was used.
			var credential = error.credential;
			// ...
		});
	});
	
	$("#btn-user-logout").click(function(){
		firebase.auth().signOut().then(function() {
			// Sign-out successful.
		});
	});

	

	const userList = document.querySelector('#user-list');

	function renderUser(doc) {

		let tr = document.createElement('tr');
		let td = document.createElement('td');
		let input = document.createElement('INPUT');
		let name = document.createElement('td');
		let lastVisit = document.createElement('td');

		tr.setAttribute('data-id', doc.id);
		input.setAttribute("type", "checkbox");

		name.textContent = doc.data().name;
		lastVisit.textContent = doc.data().lastVisit;

		tr.appendChild(td);
		td.appendChild(input);
		tr.appendChild(name);
		tr.appendChild(lastVisit);

		userList.appendChild(tr);

		//Deleting data
		let userDelete = document.querySelector('#btn-user-delete');
		let inputs = document.querySelectorAll('tbody>tr>td>input');


		userDelete.addEventListener('click', (e) => {
			e.stopPropagation();

			inputs.forEach(function(input) {
				if (input.checked) {
					let id = input.parentElement.parentElement.getAttribute('data-id');
					db.collection('users').doc(id).delete();
				}
			})
		})

	}

	db.collection('users').orderBy('lastVisit').onSnapshot(snapshot => {
		let changes = snapshot.docChanges();
		changes.forEach(change => {
			if(change.type == 'added'){
				renderUser(change.doc);
				fixCheckboxes();
			} else if (change.type == 'removed'){
				let tr = userList.querySelector('[data-id=' + change.doc.id + ']');
				userList.removeChild(tr);
				fixCheckboxes();
			}
		});
	});

	function fixCheckboxes() {
		let dataTable = document.getElementById('data-table');
		let mainCheckbox = dataTable.querySelector('input[name="select_all"]');
		let inputs = document.querySelectorAll('tbody>tr>td>input');

		inputs.forEach(function(input) {
			input.addEventListener('change', function() {
				if (this.checked) {
					mainCheckbox.checked = true;
					for (let i = 0; i < inputs.length; i++) {
						if (!inputs[i].checked) {
							mainCheckbox.checked = false;
						}
					}
				} else{
					mainCheckbox.checked = false;
				}
			});
		});

		mainCheckbox.addEventListener('change', function() {
			inputs.forEach(function(input) {
				input.checked = mainCheckbox.checked;
			});
		});
	}


});
