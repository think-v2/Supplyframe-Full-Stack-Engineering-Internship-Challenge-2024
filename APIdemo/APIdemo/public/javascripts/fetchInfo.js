// use sessionStorage to only fetch once and never again so api doesn't block ip
function grabTeams(name) {
    return new Promise((resolve, reject) => {
        try {
            var storedValue = sessionStorage.getItem('AllTeams'); // Retrieve the value

            if (storedValue == null) {
                console.log("Couldn't find AllTeams, Fetching Now...");

                fetch('/fetchData')
                    .then(response => response.json())
                    .then(data => {
                        sessionStorage.setItem('AllTeams', JSON.stringify(data));
                        //console.log("returned item:" + sessionStorage.getItem('AllTeams'));
                        resolve(JSON.parse(sessionStorage.getItem('AllTeams')));
                    })
                    .catch(error => {
                        console.error('Error fetching data:', error);
                    });

            } else {
                console.log("AllTeams already in storage");
                resolve(JSON.parse(storedValue));
            }
        } catch (e) {
            console.log("Assuming sessionStorage is not working, falling back to direct calls");
            fetch('/fetchData')
                .then(response => response.json())
                .then(data => {
                    resolve(data);
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                });
        }
    });
}
