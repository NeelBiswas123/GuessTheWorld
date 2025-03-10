READ the whole readme before trying it

Here in this project you have write all the  country name correctly and everytime you write a coutry it will increase the point and will show where the country is in the website ..........feel free to try it


You need Vs code , postgres and node/nodemon to run this project

at first create a db in postgres and set the names as follows :- user: "postgres", host: "localhost", database: "world", password: "123456", port: 5432,  ( change it to you want it's written in line 9 of index.js file)
then in postgres create two db files:- 
1. create corrected_countries table with this format
create table  corrected_countries(
id  serial primary key ,
country_name varchar(255)
)
2. create country_list table with this format :- 
create table country_list(
id  serial primary key ,
country_name varchar(255)
) 
after creating country_list import data from the db folder to country_list 
then
copy the project in ur local machine and run the code you will find the result
by default it will run on http://localhost:3000/ (feel free to customize in in index.js line 6)


problem :- unfortunately there is a conflict between sudan and south sudan so it's not working for sudan country

feel free to edit or fix the problem as you like



